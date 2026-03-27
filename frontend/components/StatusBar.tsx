"use client"

import { Activity, Wifi, WifiOff } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"

interface StatusBarProps {
  connected: boolean
  fps: number
  ruleCount: number
  alertCount: number
}

export function StatusBar({ connected, fps, ruleCount, alertCount }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">WATCHTOWER</span>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-cyan-400" />
          <span className="text-[10px] font-mono text-muted-foreground">
            {fps} FPS
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {ruleCount} rules
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {alertCount} alerts
        </span>
        <ThemeToggle />
      </div>
    </div>
  )
}
