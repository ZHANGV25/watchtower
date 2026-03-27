"use client"

import { MessageSquare } from "lucide-react"
import type { Alert } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface NarrationProps {
  alert: Alert | null
}

export function Narration({ alert }: NarrationProps) {
  if (!alert) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono">No alerts to narrate.</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2">
      <div
        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{alert.rule_name}</span>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          {alert.narration || "Analyzing..."}
        </p>
      </div>
    </div>
  )
}
