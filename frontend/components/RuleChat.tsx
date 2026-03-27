"use client"

import { SendHorizontal, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Rule } from "@/lib/types"
import { SEVERITY_COLORS } from "@/lib/types"

interface RuleChatProps {
  onAddRule: (text: string) => void
  lastAddedRule: Rule | null
}

type FeedbackState =
  | { status: "idle" }
  | { status: "parsing"; text: string }
  | { status: "success"; rule: Rule }
  | { status: "error"; text: string }

export function RuleChat({ onAddRule, lastAddedRule }: RuleChatProps) {
  const [text, setText] = useState("")
  const [feedback, setFeedback] = useState<FeedbackState>({ status: "idle" })
  const pendingRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (
      lastAddedRule &&
      feedback.status === "parsing" &&
      pendingRef.current
    ) {
      pendingRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setFeedback({ status: "success", rule: lastAddedRule })
      // Clear success after 4 seconds
      timeoutRef.current = setTimeout(() => setFeedback({ status: "idle" }), 4000)
    }
  }, [lastAddedRule, feedback.status])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || feedback.status === "parsing") return

    pendingRef.current = trimmed
    setFeedback({ status: "parsing", text: trimmed })
    onAddRule(trimmed)
    setText("")

    // Timeout: if no rule_added in 15s, show error
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (pendingRef.current) {
        pendingRef.current = null
        setFeedback({ status: "error", text: "Rule parsing timed out. Try again." })
        setTimeout(() => setFeedback({ status: "idle" }), 3000)
      }
    }, 15000)
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-border">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Add Rule
      </span>

      {/* Feedback area */}
      {feedback.status === "parsing" && (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 border border-border rounded-sm">
          <Loader2 className="h-3.5 w-3.5 shrink-0 text-cyan-400 animate-spin" />
          <div className="min-w-0">
            <p className="text-[11px] text-cyan-400 font-medium">Parsing rule</p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {feedback.text}
            </p>
          </div>
        </div>
      )}

      {feedback.status === "success" && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-muted/50 border border-border rounded-sm">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium text-foreground truncate">
                {feedback.rule.name}
              </p>
              <span
                className="text-[10px] font-mono shrink-0"
                style={{ color: SEVERITY_COLORS[feedback.rule.severity] }}
              >
                {feedback.rule.severity}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {feedback.rule.conditions.map((c, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 rounded-sm"
                >
                  {c.type}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {feedback.status === "error" && (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 border border-destructive/30 rounded-sm">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-[11px] text-destructive">{feedback.text}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          placeholder="Describe what to watch for..."
          className="text-sm h-9 font-mono"
          disabled={feedback.status === "parsing"}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSubmit}
          disabled={!text.trim() || feedback.status === "parsing"}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
