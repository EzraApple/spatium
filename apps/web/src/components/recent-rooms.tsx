import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, ArrowRight, X } from "lucide-react"
import { getVisitedRooms, removeVisitedRoom } from "@/lib/visited-rooms"
import { getLayoutsByCodes, type LayoutSummary } from "@/lib/api"
import { Button } from "@/components/ui/button"

type RecentRoom = LayoutSummary & {
  visitedAt: number
}

export function RecentRooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RecentRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRooms = async () => {
      const visited = getVisitedRooms()
      if (visited.length === 0) {
        setLoading(false)
        return
      }

      const codes = visited.map((v) => v.code)
      const layouts = await getLayoutsByCodes(codes)

      const layoutMap = new Map(layouts.map((l) => [l.roomCode, l]))

      const validRooms: RecentRoom[] = []
      for (const v of visited) {
        const layout = layoutMap.get(v.code)
        if (layout) {
          validRooms.push({ ...layout, visitedAt: v.visitedAt })
        } else {
          removeVisitedRoom(v.code)
        }
      }

      setRooms(validRooms)
      setLoading(false)
    }

    loadRooms()
  }, [])

  const handleJoin = (id: string) => {
    navigate(`/edit/${id}`)
  }

  const handleRemove = (code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeVisitedRoom(code)
    setRooms((prev) => prev.filter((r) => r.roomCode !== code))
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return null
  }

  if (rooms.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Recent rooms</span>
      </div>

      <div className="flex flex-col gap-2">
        {rooms.slice(0, 5).map((room) => (
          <button
            key={room.id}
            onClick={() => handleJoin(room.id)}
            className="group relative flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-card hover:shadow-sm"
          >
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <span className="font-medium text-foreground truncate">
                {room.name}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono tracking-wider">{room.roomCode}</span>
                <span className="text-border">·</span>
                <span>{formatTimeAgo(room.visitedAt)}</span>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />

            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => handleRemove(room.roomCode, e)}
            >
              <X className="h-3 w-3" />
            </Button>
          </button>
        ))}
      </div>
    </div>
  )
}

