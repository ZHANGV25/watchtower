from __future__ import annotations

import base64
import logging
import os

import anthropic
import cv2
import numpy as np

from models import Alert

log = logging.getLogger("watchtower.narrator")

_SYSTEM_PROMPT = """You are a safety monitoring assistant for WatchTower, a camera monitoring system.

An alert has been triggered by a detection rule. Describe what you see in the camera frame in 1-2 sentences.

Be specific about:
- Who or what is visible in the frame
- What they appear to be doing
- Why this triggered the alert
- Whether immediate action seems warranted

Be calm, factual, and concise. Do not speculate beyond what is visible. Do not be alarmist."""


class Narrator:
    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        )

    async def narrate(self, frame: np.ndarray, alert: Alert) -> str:
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        if not ok:
            return "Unable to process frame for narration."

        b64 = base64.b64encode(buf.tobytes()).decode("ascii")

        context = (
            f"Alert: {alert.rule_name}\n"
            f"Severity: {alert.severity}\n"
            f"Detections: {', '.join(d.class_name for d in alert.detections)}"
        )

        try:
            response = await self._client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=256,
                system=_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": context,
                        },
                    ],
                }],
            )

            return response.content[0].text.strip()

        except Exception as e:
            log.error("Narration failed: %s", e)
            return f"Alert triggered: {alert.rule_name}"
