"use client"

import { SendHorizontal } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RuleChatProps {
  onAddRule: (text: string) => void
}

export function RuleChat({ onAddRule }: RuleChatProps) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setLoading(true)
    onAddRule(trimmed)
    setText("")
    // Reset loading after a short delay (rule_added event will confirm)
    setTimeout(() => setLoading(false), 3000)
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-border">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Add Rule
      </span>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          placeholder="Describe what to watch for..."
          className="text-sm h-9 font-mono"
          disabled={loading}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      {loading && (
        <span className="text-xs text-muted-foreground font-mono">
          Parsing rule...
        </span>
      )}
    </div>
  )
}
