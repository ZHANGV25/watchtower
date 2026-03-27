import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createElement, type ReactNode } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Render inline markdown (**bold**) as React elements.
 * Returns an array of strings and <strong> elements.
 */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(createElement("strong", { key: match.index, className: "font-semibold text-foreground" }, match[1]))
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}
