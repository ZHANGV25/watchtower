from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from detector import Detector
from models import Alert, Rule, WSMessage, Zone
from narrator import Narrator
from replay_buffer import ReplayBuffer
from rule_engine import RuleEngine
from rule_parser import RuleParser
from zone_generator import ZoneGenerator

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("watchtower")

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------

detector = Detector()
rule_engine = RuleEngine()
rule_parser = RuleParser()
zone_generator = ZoneGenerator()
narrator = Narrator()
replay_buffer = ReplayBuffer(max_seconds=1800, fps=2)

zones: list[Zone] = []
rules: list[Rule] = []
alerts: list[Alert] = []
connected_clients: list[WebSocket] = []

camera: cv2.VideoCapture | None = None
camera_running = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def frame_to_b64(frame: np.ndarray, quality: int = 70) -> str:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


async def broadcast(msg: WSMessage) -> None:
    raw = msg.model_dump_json()
    dead: list[WebSocket] = []
    for ws in connected_clients:
        try:
            await ws.send_text(raw)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_clients.remove(ws)


# ---------------------------------------------------------------------------
# Camera loop
# ---------------------------------------------------------------------------

async def camera_loop() -> None:
    global camera, camera_running

    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        log.error("Cannot open camera")
        return

    camera_running = True
    log.info("Camera started")

    frame_interval = 1.0 / 24  # target ~24 fps
    last_frame_time = 0.0

    while camera_running:
        now = time.time()
        if now - last_frame_time < frame_interval:
            await asyncio.sleep(0.003)
            continue

        ok, frame = camera.read()
        if not ok:
            await asyncio.sleep(0.01)
            continue

        last_frame_time = now

        # Only run pose estimation if any rule uses pose conditions
        pose_types = {"person_pose", "person_falling"}
        need_pose = any(
            c.type in pose_types
            for r in rules if r.enabled
            for c in r.conditions
        )

        # Run detection in thread pool so it doesn't block the event loop
        loop = asyncio.get_event_loop()
        detections = await loop.run_in_executor(
            None, detector.detect, frame, need_pose
        )

        # Store in replay buffer
        replay_buffer.add_frame(frame, now)

        # Check rules
        fired = rule_engine.evaluate(rules, zones, detections, now)

        # Process fired alerts: verify with LLM before broadcasting
        for alert in fired:
            alert.frame_b64 = frame_to_b64(frame, quality=80)
            asyncio.create_task(_verify_and_broadcast_alert(alert, frame))

        # Encode frame off the event loop
        frame_b64 = await loop.run_in_executor(
            None, frame_to_b64, frame, 50
        )

        # Broadcast frame + detections
        await broadcast(WSMessage(
            type="frame",
            payload={
                "frame": frame_b64,
                "detections": [d.model_dump() for d in detections],
                "timestamp": now,
                "fps": round(1.0 / max(time.time() - now, 0.001)),
            },
        ))

    camera.release()
    log.info("Camera stopped")


async def _verify_and_broadcast_alert(alert: Alert, frame: np.ndarray) -> None:
    try:
        result = await narrator.verify(frame, alert)
        if not result.confirmed:
            log.info("Alert '%s' rejected by LLM verification", alert.rule_name)
            return
        alert.narration = result.note
        alerts.append(alert)
        await broadcast(WSMessage(type="alert", payload=alert.model_dump()))
        if result.note:
            await broadcast(WSMessage(
                type="narration",
                payload={"alert_id": alert.id, "narration": result.note},
            ))
    except Exception as e:
        log.error("Verification failed: %s", e)
        # On error, still broadcast (don't suppress real alerts)
        alerts.append(alert)
        await broadcast(WSMessage(type="alert", payload=alert.model_dump()))


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = None
    if os.getenv("WATCHTOWER_NO_CAMERA") != "1":
        task = asyncio.create_task(camera_loop())
    else:
        log.info("Camera disabled (WATCHTOWER_NO_CAMERA=1)")
    yield
    global camera_running
    camera_running = False
    if task:
        task.cancel()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="WatchTower", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# WebSocket handler
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    connected_clients.append(ws)
    log.info("Client connected (%d total)", len(connected_clients))

    # Send current state on connect
    await ws.send_text(WSMessage(
        type="init",
        payload={
            "zones": [z.model_dump() for z in zones],
            "rules": [r.model_dump() for r in rules],
            "alerts": [a.model_dump() for a in alerts[-50:]],
        },
    ).model_dump_json())

    try:
        while True:
            raw = await ws.receive_text()
            msg = WSMessage.model_validate_json(raw)
            await _handle_message(ws, msg)
    except WebSocketDisconnect:
        pass
    finally:
        if ws in connected_clients:
            connected_clients.remove(ws)
        log.info("Client disconnected (%d total)", len(connected_clients))


async def _handle_message(ws: WebSocket, msg: WSMessage) -> None:
    handler = _message_handlers.get(msg.type)
    if handler:
        await handler(ws, msg.payload)
    else:
        log.warning("Unknown message type: %s", msg.type)


# ---------------------------------------------------------------------------
# Message handlers
# ---------------------------------------------------------------------------

async def _handle_add_rule(ws: WebSocket, payload: dict[str, Any]) -> None:
    text = payload.get("text", "")
    if not text:
        return

    zone_names = [z.name for z in zones]
    parsed = await rule_parser.parse(text, zone_names)
    if parsed:
        rules.append(parsed)
        await broadcast(WSMessage(
            type="rule_added",
            payload=parsed.model_dump(),
        ))


async def _handle_update_rule(ws: WebSocket, payload: dict[str, Any]) -> None:
    rule_id = payload.get("id", "")
    for i, r in enumerate(rules):
        if r.id == rule_id:
            updated = r.model_copy(update={
                k: v for k, v in payload.items()
                if k != "id" and hasattr(r, k)
            })
            rules[i] = updated
            await broadcast(WSMessage(
                type="rule_updated",
                payload=updated.model_dump(),
            ))
            return


async def _handle_delete_rule(ws: WebSocket, payload: dict[str, Any]) -> None:
    rule_id = payload.get("id", "")
    for i, r in enumerate(rules):
        if r.id == rule_id:
            rules.pop(i)
            await broadcast(WSMessage(
                type="rule_deleted",
                payload={"id": rule_id},
            ))
            return


async def _handle_toggle_rule(ws: WebSocket, payload: dict[str, Any]) -> None:
    rule_id = payload.get("id", "")
    for i, r in enumerate(rules):
        if r.id == rule_id:
            updated = r.model_copy(update={"enabled": not r.enabled})
            rules[i] = updated
            await broadcast(WSMessage(
                type="rule_updated",
                payload=updated.model_dump(),
            ))
            return


async def _handle_update_zones(ws: WebSocket, payload: dict[str, Any]) -> None:
    global zones
    raw_zones = payload.get("zones", [])
    zones = [Zone.model_validate(z) for z in raw_zones]
    await broadcast(WSMessage(
        type="zones_updated",
        payload={"zones": [z.model_dump() for z in zones]},
    ))


async def _handle_auto_zones(ws: WebSocket, payload: dict[str, Any]) -> None:
    global zones
    if camera is None or not camera.isOpened():
        return

    ok, frame = camera.read()
    if not ok:
        return

    generated = await zone_generator.generate(frame)
    zones = generated
    await broadcast(WSMessage(
        type="zones_updated",
        payload={"zones": [z.model_dump() for z in zones]},
    ))


async def _handle_get_replay(ws: WebSocket, payload: dict[str, Any]) -> None:
    timestamp = payload.get("timestamp", 0.0)
    duration = payload.get("duration", 10.0)
    frames = replay_buffer.get_frames(timestamp, duration)
    await ws.send_text(WSMessage(
        type="replay",
        payload={
            "frames": [
                {"frame": frame_to_b64(f, quality=50), "timestamp": t}
                for f, t in frames
            ],
        },
    ).model_dump_json())


async def _handle_get_replay_timestamps(ws: WebSocket, payload: dict[str, Any]) -> None:
    timestamps = replay_buffer.get_timestamps()
    await ws.send_text(WSMessage(
        type="replay_timestamps",
        payload={
            "start": timestamps[0] if timestamps else 0,
            "end": timestamps[-1] if timestamps else 0,
            "count": len(timestamps),
        },
    ).model_dump_json())


async def _handle_get_frame_at(ws: WebSocket, payload: dict[str, Any]) -> None:
    timestamp = payload.get("timestamp", 0.0)
    result = replay_buffer.get_frame_at(timestamp)
    if result is None:
        await ws.send_text(WSMessage(
            type="replay_frame",
            payload={"frame": None, "timestamp": 0},
        ).model_dump_json())
        return
    frame, ts = result
    await ws.send_text(WSMessage(
        type="replay_frame",
        payload={"frame": frame_to_b64(frame, quality=60), "timestamp": ts},
    ).model_dump_json())


async def _handle_clear_alerts(ws: WebSocket, payload: dict[str, Any]) -> None:
    global alerts
    alerts = []
    await broadcast(WSMessage(type="alerts_cleared", payload={}))


async def _handle_clear_rules(ws: WebSocket, payload: dict[str, Any]) -> None:
    global rules
    rules = []
    rule_engine._last_fired.clear()
    rule_engine._duration_tracking.clear()
    await broadcast(WSMessage(type="rules_cleared", payload={}))


_message_handlers = {
    "add_rule": _handle_add_rule,
    "update_rule": _handle_update_rule,
    "delete_rule": _handle_delete_rule,
    "toggle_rule": _handle_toggle_rule,
    "update_zones": _handle_update_zones,
    "auto_zones": _handle_auto_zones,
    "get_replay": _handle_get_replay,
    "get_replay_timestamps": _handle_get_replay_timestamps,
    "get_frame_at": _handle_get_frame_at,
    "clear_alerts": _handle_clear_alerts,
    "clear_rules": _handle_clear_rules,
}
