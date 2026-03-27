"use client"

import { useMemo } from "react"
import type { Alert } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface AlertTimelineProps {
  alerts: Alert[]
  currentTimestamp: number
  onSeek: (timestamp: number) => void
}

const TIMELINE_DURATION = 1800 // 30 minutes in seconds

function formatTimeShort(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AlertTimeline({ alerts, currentTimestamp, onSeek }: AlertTimelineProps) {
  const timelineStart = currentTimestamp - TIMELINE_DURATION
  const timelineEnd = currentTimestamp

  const markers = useMemo(() => {
    return alerts
      .filter((a) => a.timestamp >= timelineStart && a.timestamp <= timelineEnd)
      .map((alert) => ({
        alert,
        position: ((alert.timestamp - timelineStart) / TIMELINE_DURATION) * 100,
      }))
  }, [alerts, timelineStart, timelineEnd])

  // Time labels (every 5 minutes)
  const timeLabels = useMemo(() => {
    const labels: Array<{ time: string; position: number }> = []
    for (let i = 0; i <= 6; i++) {
      const ts = timelineStart + (TIMELINE_DURATION / 6) * i
      labels.push({
        time: formatTimeShort(ts),
        position: (i / 6) * 100,
      })
    }
    return labels
  }, [timelineStart])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const ts = timelineStart + pct * TIMELINE_DURATION
    onSeek(ts)
  }

  return (
    <div className="px-3 py-2 border-t border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Timeline
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          Last 30 min
        </span>
      </div>

      <div
        className="relative h-6 bg-muted/30 rounded-sm cursor-pointer border border-border"
        onClick={handleClick}
      >
        {/* Current position indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-cyan-400" />

        {/* Alert markers */}
        {markers.map(({ alert, position }) => (
          <div
            key={alert.id}
            className="absolute top-1 bottom-1 w-1 rounded-sm"
            style={{
              left: `${position}%`,
              backgroundColor: SEVERITY_COLORS[alert.severity],
            }}
            title={`${alert.rule_name} - ${formatTimeShort(alert.timestamp)}`}
          />
        ))}
      </div>

      {/* Time labels */}
      <div className="relative h-4 mt-0.5">
        {timeLabels.map((label) => (
          <span
            key={label.position}
            className="absolute text-[9px] text-muted-foreground font-mono -translate-x-1/2"
            style={{ left: `${label.position}%` }}
          >
            {label.time}
          </span>
        ))}
      </div>
    </div>
  )
}
