"use client"

import { MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Alert } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"
import { renderInlineMarkdown } from "@/lib/utils"

interface NarrationProps {
  alert: Alert | null
}

export function Narration({ alert }: NarrationProps) {
  if (!alert) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono">No alerts to narrate.</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div
        className="w-2 h-2 rounded-full mt-1 shrink-0"
        style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
      />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{alert.rule_name}</span>
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0 h-3.5 shrink-0 border"
            style={{
              color: SEVERITY_COLORS[alert.severity],
              borderColor: SEVERITY_COLORS[alert.severity] + "50",
            }}
          >
            {alert.severity}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {alert.narration ? renderInlineMarkdown(alert.narration) : "Confirmed"}
        </p>
      </div>
    </div>
  )
}
