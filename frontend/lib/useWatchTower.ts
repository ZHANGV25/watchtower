"use client"

import { useCallback, useEffect, useState } from "react"
import { socket } from "./websocket"
import type {
  Alert,
  Detection,
  FramePayload,
  InitPayload,
  Rule,
  Zone,
} from "./types"

export function useWatchTower() {
  const [connected, setConnected] = useState(false)
  const [frame, setFrame] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lastAddedRule, setLastAddedRule] = useState<Rule | null>(null)
  const [fps, setFps] = useState(0)
  const [timestamp, setTimestamp] = useState(0)
  const [bufferStart, setBufferStart] = useState(0)

  useEffect(() => {
    socket.connect()

    const unsubs = [
      socket.on("connected", () => setConnected(true)),
      socket.on("disconnected", () => setConnected(false)),
      socket.on("init", (data) => {
        const init = data as unknown as InitPayload
        setZones(init.zones)
        setRules(init.rules)
        setAlerts(init.alerts)
      }),
      socket.on("frame", (data) => {
        const f = data as unknown as FramePayload
        setFrame(f.frame)
        setDetections(f.detections)
        setFps(f.fps)
        setTimestamp(f.timestamp)
        setBufferStart((prev) => (prev === 0 ? f.timestamp : prev))
      }),
      socket.on("alert", (data) => {
        const alert = data as unknown as Alert
        setAlerts((prev) => [alert, ...prev].slice(0, 100))
      }),
      socket.on("narration", (data) => {
        const { alert_id, narration } = data as { alert_id: string; narration: string }
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert_id ? { ...a, narration } : a))
        )
      }),
      socket.on("rule_added", (data) => {
        const rule = data as unknown as Rule
        setRules((prev) => [...prev, rule])
        setLastAddedRule(rule)
      }),
      socket.on("rule_updated", (data) => {
        const rule = data as unknown as Rule
        setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)))
      }),
      socket.on("rule_deleted", (data) => {
        const { id } = data as { id: string }
        setRules((prev) => prev.filter((r) => r.id !== id))
      }),
      socket.on("zones_updated", (data) => {
        const { zones: newZones } = data as { zones: Zone[] }
        setZones(newZones)
      }),
      socket.on("alerts_cleared", () => setAlerts([])),
      socket.on("rules_cleared", () => setRules([])),
    ]

    return () => {
      unsubs.forEach((unsub) => unsub())
      socket.disconnect()
    }
  }, [])

  const addRule = useCallback((text: string, severity: string = "medium") => {
    socket.send("add_rule", { text, severity })
  }, [])

  const toggleRule = useCallback((id: string) => {
    socket.send("toggle_rule", { id })
  }, [])

  const deleteRule = useCallback((id: string) => {
    socket.send("delete_rule", { id })
  }, [])

  const updateZones = useCallback((newZones: Zone[]) => {
    socket.send("update_zones", { zones: newZones })
  }, [])

  const autoGenerateZones = useCallback(() => {
    socket.send("auto_zones", {})
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
    socket.send("clear_alerts", {})
  }, [])

  const clearRules = useCallback(() => {
    setRules([])
    socket.send("clear_rules", {})
  }, [])

  return {
    connected,
    frame,
    detections,
    zones,
    rules,
    alerts,
    lastAddedRule,
    fps,
    timestamp,
    bufferStart,
    addRule,
    toggleRule,
    deleteRule,
    updateZones,
    autoGenerateZones,
    clearAlerts,
    clearRules,
  }
}
