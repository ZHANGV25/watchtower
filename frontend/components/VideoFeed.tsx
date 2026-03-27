"use client"

import { useEffect, useRef } from "react"
import type { Detection, Zone } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface VideoFeedProps {
  frame: string | null
  detections: Detection[]
  zones: Zone[]
  fps: number
  timestamp: number
}

const CORNER_SIZE = 12
const CORNER_THICKNESS = 2

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = CORNER_THICKNESS

  // Top-left
  ctx.beginPath()
  ctx.moveTo(x, y + CORNER_SIZE)
  ctx.lineTo(x, y)
  ctx.lineTo(x + CORNER_SIZE, y)
  ctx.stroke()

  // Top-right
  ctx.beginPath()
  ctx.moveTo(x + w - CORNER_SIZE, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + CORNER_SIZE)
  ctx.stroke()

  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(x, y + h - CORNER_SIZE)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x + CORNER_SIZE, y + h)
  ctx.stroke()

  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(x + w - CORNER_SIZE, y + h)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + w, y + h - CORNER_SIZE)
  ctx.stroke()
}

function drawZones(
  ctx: CanvasRenderingContext2D,
  zones: Zone[],
  canvasW: number,
  canvasH: number,
) {
  for (const zone of zones) {
    const x = (zone.x / 100) * canvasW
    const y = (zone.y / 100) * canvasH
    const w = (zone.width / 100) * canvasW
    const h = (zone.height / 100) * canvasH

    // Semi-transparent fill
    ctx.fillStyle = zone.color + "15"
    ctx.fillRect(x, y, w, h)

    // Border with glow
    ctx.shadowColor = zone.color
    ctx.shadowBlur = 6
    ctx.strokeStyle = zone.color + "80"
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
    ctx.shadowBlur = 0

    // Label
    ctx.font = "11px var(--font-geist-mono), monospace"
    ctx.fillStyle = zone.color
    const textW = ctx.measureText(zone.name).width
    ctx.fillStyle = "#000000aa"
    ctx.fillRect(x, y - 16, textW + 8, 16)
    ctx.fillStyle = zone.color
    ctx.fillText(zone.name, x + 4, y - 4)
  }
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  canvasW: number,
  canvasH: number,
) {
  for (const det of detections) {
    const x = (det.bbox.x / 100) * canvasW
    const y = (det.bbox.y / 100) * canvasH
    const w = (det.bbox.width / 100) * canvasW
    const h = (det.bbox.height / 100) * canvasH

    const color = "#22d3ee"

    // Corner brackets with glow
    ctx.shadowColor = color
    ctx.shadowBlur = 4
    drawCornerBrackets(ctx, x, y, w, h, color)
    ctx.shadowBlur = 0

    // Label background
    const label = `${det.class_name} ${Math.round(det.confidence * 100)}%`
    ctx.font = "11px var(--font-geist-mono), monospace"
    const textW = ctx.measureText(label).width
    ctx.fillStyle = "#000000cc"
    ctx.fillRect(x, y - 18, textW + 8, 16)

    // Label text
    ctx.fillStyle = color
    ctx.fillText(label, x + 4, y - 6)
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  fps: number,
  timestamp: number,
) {
  ctx.font = "11px var(--font-geist-mono), monospace"

  // Crosshair (very subtle)
  ctx.strokeStyle = "#22d3ee10"
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(canvasW / 2, 0)
  ctx.lineTo(canvasW / 2, canvasH)
  ctx.moveTo(0, canvasH / 2)
  ctx.lineTo(canvasW, canvasH / 2)
  ctx.stroke()

  // FPS counter - top right
  const fpsText = `${fps} FPS`
  const fpsW = ctx.measureText(fpsText).width
  ctx.fillStyle = "#000000aa"
  ctx.fillRect(canvasW - fpsW - 16, 8, fpsW + 12, 18)
  ctx.fillStyle = "#22d3ee"
  ctx.fillText(fpsText, canvasW - fpsW - 10, 21)

  // Timestamp - bottom left
  const date = new Date(timestamp * 1000)
  const timeStr = date.toLocaleTimeString("en-US", { hour12: false })
  ctx.fillStyle = "#000000aa"
  ctx.fillRect(8, canvasH - 28, ctx.measureText(timeStr).width + 12, 18)
  ctx.fillStyle = "#22d3ee80"
  ctx.fillText(timeStr, 14, canvasH - 14)

  // Recording indicator - top left
  ctx.fillStyle = "#ef4444"
  ctx.beginPath()
  ctx.arc(20, 17, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#ef4444"
  ctx.fillText("REC", 30, 21)
}

export function VideoFeed({ frame, detections, zones, fps, timestamp }: VideoFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!frame) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (!imgRef.current) {
      imgRef.current = new Image()
    }

    const img = imgRef.current
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      ctx.drawImage(img, 0, 0)
      drawZones(ctx, zones, canvas.width, canvas.height)
      drawDetections(ctx, detections, canvas.width, canvas.height)
      drawHUD(ctx, canvas.width, canvas.height, fps, timestamp)
    }
    img.src = `data:image/jpeg;base64,${frame}`
  }, [frame, detections, zones, fps, timestamp])

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {!frame && (
        <div className="text-muted-foreground font-mono text-sm">
          Waiting for camera feed...
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  )
}
