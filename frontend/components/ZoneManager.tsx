"use client"

import { ScanSearch, Trash2, Pencil } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Zone } from "@/lib/types"

interface ZoneManagerProps {
  zones: Zone[]
  onUpdateZones: (zones: Zone[]) => void
  onAutoGenerate: () => void
}

export function ZoneManager({ zones, onUpdateZones, onAutoGenerate }: ZoneManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const handleDelete = (id: string) => {
    onUpdateZones(zones.filter((z) => z.id !== id))
  }

  const handleStartEdit = (zone: Zone) => {
    setEditingId(zone.id)
    setEditName(zone.name)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    onUpdateZones(
      zones.map((z) =>
        z.id === editingId ? { ...z, name: editName } : z
      )
    )
    setEditingId(null)
    setEditName("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Zones
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAutoGenerate}
          className="h-7 text-[13px] gap-1.5"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          Auto-detect
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {zones.length === 0 && (
            <div className="text-[13px] text-muted-foreground px-2 py-4 text-center">
              No zones defined. Click Auto-detect or draw zones on the feed.
            </div>
          )}
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted/50 group"
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0 border"
                style={{
                  backgroundColor: zone.color + "30",
                  borderColor: zone.color,
                }}
              />

              {editingId === zone.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit()
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  onBlur={handleSaveEdit}
                  className="h-6 text-xs px-1"
                  autoFocus
                />
              ) : (
                <span className="text-[13px] font-mono truncate flex-1">
                  {zone.name}
                </span>
              )}

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleStartEdit(zone)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={() => handleDelete(zone.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
