import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { LayoutHeader } from "@/components/layout-header"
import { CursorCanvas } from "@/components/cursor-canvas"
import { LocalCursor } from "@/components/local-cursor"
import { ClickRipple } from "@/components/click-ripple"
import { ConnectionStatus } from "@/components/connection-status"
import { useCursorSync } from "@/hooks/use-cursor-sync"
import { getLayout, updateLayoutName } from "@/lib/api"
import type { Layout } from "@apartment-planner/shared"

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [loading, setLoading] = useState(true)
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 })

  const {
    cursors,
    clicks,
    status,
    myColor,
    clientCount,
    sendCursorMove,
    sendCursorLeave,
    sendClick,
  } = useCursorSync(id)

  useEffect(() => {
    if (!id) {
      navigate("/")
      return
    }

    getLayout(id)
      .then(setLayout)
      .catch(() => navigate("/"))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleNameChange = useCallback(async (name: string) => {
    if (!id) return
    try {
      const updated = await updateLayoutName(id, name)
      setLayout(updated)
    } catch {
      /* Silently fail - user can retry */
    }
  }, [id])

  const handleMouseMove = (e: React.MouseEvent) => {
    setLocalCursor({ x: e.clientX, y: e.clientY })
    sendCursorMove(e.clientX, e.clientY)
  }

  const handleMouseLeave = () => {
    setLocalCursor({ x: 0, y: 0 })
    sendCursorLeave()
  }

  const handleClick = (e: React.MouseEvent) => {
    sendClick(e.clientX, e.clientY)
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-blueprint">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!layout) {
    return null
  }

  return (
    <div className="flex h-full w-full flex-col bg-blueprint">
      <LayoutHeader layout={layout} onNameChange={handleNameChange} />

      <div
        className="relative flex-1 cursor-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="absolute inset-0 grid-blueprint-large" />

        <CursorCanvas cursors={cursors} />
        <LocalCursor color={myColor} x={localCursor.x} y={localCursor.y} />
        {clicks.map((click) => (
          <ClickRipple key={click.id} click={click} />
        ))}
        <ConnectionStatus status={status} clientCount={clientCount} myColor={myColor} />
      </div>
    </div>
  )
}

