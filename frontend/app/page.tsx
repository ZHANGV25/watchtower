"use client"

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
import { useState } from "react"

export default function Dashboard() {
  const {
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
  } = useWatchTower()

  const [replayTimestamp, setReplayTimestamp] = useState<number | null>(null)
  const isReplayOpen = replayTimestamp !== null

  const latestAlert = alerts.length > 0 ? alerts[0] : null

  const handleSelectAlert = (alert: import("@/lib/types").Alert) => {
    setReplayTimestamp(alert.timestamp)
  }

  const handleTimelineScrub = (ts: number) => {
    setReplayTimestamp(ts)
  }

  const handleCloseReplay = () => {
    setReplayTimestamp(null)
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
        <div className="w-72 border-r border-border flex flex-col shrink-0 overflow-hidden">
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
              onClearAll={clearRules}
            />
            <RuleChat onAddRule={addRule} lastAddedRule={lastAddedRule} />
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
          <div className="border-t border-border bg-card shrink-0 overflow-hidden">
            <Narration alert={latestAlert} />
          </div>

          {/* Timeline */}
          <AlertTimeline
            alerts={alerts}
            currentTimestamp={timestamp}
            bufferStart={bufferStart}
            onScrub={handleTimelineScrub}
            isReplayOpen={isReplayOpen}
          />
        </div>

        {/* Right sidebar: Alerts */}
        <div className="w-80 border-l border-border shrink-0 overflow-hidden">
          <AlertLog
            alerts={alerts}
            onSelectAlert={handleSelectAlert}
            onClearAll={clearAlerts}
          />
        </div>
      </div>

      {/* Replay overlay - full screen, separate from everything */}
      {isReplayOpen && (
        <ReplayViewer
          timestamp={replayTimestamp}
          onClose={handleCloseReplay}
        />
      )}
    </div>
  )
}
