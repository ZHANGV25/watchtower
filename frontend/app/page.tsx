"use client"

import { useState } from "react"
import { AlertLog } from "@/components/AlertLog"
import { AlertTimeline } from "@/components/AlertTimeline"
import { Narration } from "@/components/Narration"
import { ReplayViewer } from "@/components/ReplayViewer"
import { RuleChat } from "@/components/RuleChat"
import { RuleList } from "@/components/RuleList"
import { StatusBar } from "@/components/StatusBar"
import { VideoFeed } from "@/components/VideoFeed"
import { ZoneManager } from "@/components/ZoneManager"
import { useWatchTower } from "@/lib/useWatchTower"
import type { Alert } from "@/lib/types"

export default function Dashboard() {
  const {
    connected,
    frame,
    detections,
    zones,
    rules,
    alerts,
    fps,
    timestamp,
    addRule,
    toggleRule,
    deleteRule,
    updateZones,
    autoGenerateZones,
    requestReplay,
  } = useWatchTower()

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [replayTimestamp, setReplayTimestamp] = useState<number | null>(null)

  const latestAlert = alerts.length > 0 ? alerts[0] : null

  const handleSelectAlert = (alert: Alert) => {
    setSelectedAlert(alert)
    setReplayTimestamp(alert.timestamp)
  }

  const handleTimelineSeek = (ts: number) => {
    setReplayTimestamp(ts)
  }

  return (
    <div className="flex flex-col h-full">
      <StatusBar
        connected={connected}
        fps={fps}
        ruleCount={rules.length}
        alertCount={alerts.length}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Zones + Rules */}
        <div className="w-64 border-r border-border flex flex-col shrink-0">
          <div className="flex-1 min-h-0 border-b border-border">
            <ZoneManager
              zones={zones}
              onUpdateZones={updateZones}
              onAutoGenerate={autoGenerateZones}
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <RuleList
              rules={rules}
              onToggle={toggleRule}
              onDelete={deleteRule}
            />
            <RuleChat onAddRule={addRule} />
          </div>
        </div>

        {/* Center: Video feed + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 min-h-0">
            <VideoFeed
              frame={frame}
              detections={detections}
              zones={zones}
              fps={fps}
              timestamp={timestamp}
            />
          </div>

          {/* Narration bar */}
          <div className="border-t border-border bg-card">
            <Narration alert={latestAlert} />
          </div>

          {/* Timeline */}
          <AlertTimeline
            alerts={alerts}
            currentTimestamp={timestamp}
            onSeek={handleTimelineSeek}
          />

          {/* Replay overlay */}
          {replayTimestamp !== null && (
            <ReplayViewer
              timestamp={replayTimestamp}
              onClose={() => setReplayTimestamp(null)}
            />
          )}
        </div>

        {/* Right sidebar: Alerts */}
        <div className="w-72 border-l border-border shrink-0">
          <AlertLog
            alerts={alerts}
            onSelectAlert={handleSelectAlert}
          />
        </div>
      </div>
    </div>
  )
}
