// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export interface Zone {
  id: string
  name: string
  x: number // percentage 0-100
  y: number
  width: number
  height: number
  color: string
}

// ---------------------------------------------------------------------------
// Detections
// ---------------------------------------------------------------------------

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PoseKeypoint {
  name: string
  x: number
  y: number
  visibility: number
}

export interface PolygonPoint {
  x: number // percentage 0-100
  y: number
}

export interface Detection {
  class_name: string
  confidence: number
  bbox: BBox
  pose: PoseKeypoint[] | null
  mask: PolygonPoint[] | null // segmentation polygon outline
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface Condition {
  type: string
  params: Record<string, unknown>
}

export interface Rule {
  id: string
  name: string
  natural_language: string
  conditions: Condition[]
  severity: "low" | "medium" | "high" | "critical"
  enabled: boolean
  created_at: number
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface Alert {
  id: string
  rule_id: string
  rule_name: string
  severity: "low" | "medium" | "high" | "critical"
  timestamp: number
  frame_b64: string
  narration: string
  detections: Detection[]
}

// ---------------------------------------------------------------------------
// WebSocket messages
// ---------------------------------------------------------------------------

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
}

export interface FramePayload {
  frame: string
  detections: Detection[]
  timestamp: number
  fps: number
}

export interface InitPayload {
  zones: Zone[]
  rules: Rule[]
  alerts: Alert[]
}

export interface ReplayPayload {
  frames: Array<{ frame: string; timestamp: number }>
}

export interface ReplayTimestampsPayload {
  start: number
  end: number
  count: number
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

export const SEVERITY_COLORS: Record<string, string> = {
  low: "#4ade80",      // green-400
  medium: "#fbbf24",   // amber-400
  high: "#f97316",     // orange-500
  critical: "#ef4444", // red-500
}

export const SEVERITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}
