import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Layout } from "@apartment-planner/shared"

interface LayoutHeaderProps {
  layout: Layout
  onNameChange: (name: string) => void
}

export function LayoutHeader({ layout, onNameChange }: LayoutHeaderProps) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(layout.name)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(layout.name)
  }, [layout.name])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== layout.name) {
      onNameChange(trimmed)
    } else {
      setEditValue(layout.name)
    }
    setIsEditing(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(layout.roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-md p-1 transition-colors hover:bg-muted"
        >
          <img src="/favicon-32x32.png" alt="Spatium" className="h-8 w-8" />
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit()
              if (e.key === "Escape") {
                setEditValue(layout.name)
                setIsEditing(false)
              }
            }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-md px-2 py-1 text-lg font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {layout.name}
          </button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className={cn(
          "gap-2 font-mono tracking-wider transition-all",
          copied && "border-green-500 text-green-600"
        )}
      >
        <span>{layout.roomCode}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </header>
  )
}

