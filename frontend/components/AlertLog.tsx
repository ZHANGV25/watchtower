"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Alert } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface AlertLogProps {
  alerts: Alert[]
  onSelectAlert: (alert: Alert) => void
  onClearAll: () => void
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false })
}

export function AlertLog({ alerts, onSelectAlert, onClearAll }: AlertLogProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Alerts
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            {alerts.length}
          </span>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onClick={onClearAll}
              title="Clear all alerts"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {alerts.length === 0 && (
            <div className="text-[11px] text-muted-foreground px-2 py-4 text-center">
              No alerts triggered yet.
            </div>
          )}
          {alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => onSelectAlert(alert)}
              className="w-full text-left flex items-start gap-2.5 px-2 py-2.5 rounded-sm hover:bg-muted/50 transition-colors"
            >
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium leading-tight">
                    {alert.rule_name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 shrink-0 border"
                    style={{
                      color: SEVERITY_COLORS[alert.severity],
                      borderColor: SEVERITY_COLORS[alert.severity] + "50",
                    }}
                  >
                    {alert.severity}
                  </Badge>
                </div>

                {alert.narration ? (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-4">
                    {alert.narration}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/50 mt-1 font-mono">
                    Analyzing...
                  </p>
                )}

                <span className="text-[10px] text-muted-foreground/60 font-mono mt-1 block">
                  {formatTime(alert.timestamp)}
                </span>
              </div>

              {alert.frame_b64 && (
                <img
                  src={`data:image/jpeg;base64,${alert.frame_b64}`}
                  alt="Alert capture"
                  className="w-14 h-10 object-cover rounded-sm shrink-0 border border-border"
                />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
