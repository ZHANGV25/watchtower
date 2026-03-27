"use client"

import { Play, Square, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/websocket"
import type { ReplayPayload } from "@/lib/types"

interface ReplayViewerProps {
  timestamp: number
  onClose: () => void
}

export function ReplayViewer({ timestamp, onClose }: ReplayViewerProps) {
  const [frames, setFrames] = useState<Array<{ frame: string; timestamp: number }>>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    socket.send("get_replay", { timestamp: timestamp - 5, duration: 15 })

    const unsub = socket.on("replay", (data) => {
      const payload = data as unknown as ReplayPayload
      setFrames(payload.frames)
      setCurrentIdx(0)
      setPlaying(true)
    })

    return unsub
  }, [timestamp])

  useEffect(() => {
    if (playing && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx((prev) => {
          if (prev >= frames.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 500) // 2 FPS playback
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, frames.length])

  const togglePlay = useCallback(() => {
    if (currentIdx >= frames.length - 1) {
      setCurrentIdx(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }, [currentIdx, frames.length])

  const currentFrame = frames[currentIdx]

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Replay
          </span>
          {currentFrame && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {new Date(currentFrame.timestamp * 1000).toLocaleTimeString("en-US", { hour12: false })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePlay}>
            {playing ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {currentFrame ? (
          <img
            src={`data:image/jpeg;base64,${currentFrame.frame}`}
            alt="Replay frame"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="text-sm text-muted-foreground font-mono">
            Loading replay...
          </span>
        )}
      </div>

      {/* Scrubber */}
      {frames.length > 0 && (
        <div className="px-3 py-2 border-t border-border">
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={currentIdx}
            onChange={(e) => {
              setCurrentIdx(Number(e.target.value))
              setPlaying(false)
            }}
            className="w-full h-1 accent-cyan-400"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-mono text-muted-foreground">
              {currentIdx + 1}/{frames.length} frames
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
