import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { RecentRooms } from "@/components/recent-rooms"
import { createLayout, getLayoutByCode } from "@/lib/api"
import { ArrowRight } from "lucide-react"

export function LandingPage() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    if (isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      const layout = await createLayout()
      navigate(`/edit/${layout.id}`)
    } catch {
      setError("Failed to create layout. Please try again.")
      setIsCreating(false)
    }
  }, [isCreating, navigate])

  const handleJoin = useCallback(async () => {
    if (isJoining || roomCode.length !== 6) return
    setIsJoining(true)
    setError(null)
    try {
      const layout = await getLayoutByCode(roomCode.toUpperCase())
      navigate(`/edit/${layout.id}`)
    } catch {
      setError("Room not found. Check the code and try again.")
      setIsJoining(false)
    }
  }, [isJoining, roomCode, navigate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault()
        handleCreate()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleCreate])

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-blueprint">
      <div className="absolute inset-0 grid-blueprint-large grid-blueprint-drift opacity-60" />

      <div className="absolute inset-0 bg-gradient-to-b from-blueprint-light via-transparent to-blueprint" />

      <div className="relative z-10 px-6">
        <div className="panel-neo relative w-full max-w-2xl bg-card/95 px-8 py-10 backdrop-blur-sm">
          <div
            className="absolute -top-3 left-6 panel-neo bg-accent px-3 py-1 text-xs font-mono uppercase tracking-wider text-accent-foreground"
            aria-hidden="true"
          >
            build it
          </div>

          <div className="flex flex-col items-center gap-12">
            <div
              className="flex flex-col items-center gap-4 opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms" }}
            >
              <div className="flex items-center gap-4">
                <img src="/android-chrome-192x192.png" alt="Spatium" className="h-24 w-24" />
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Spatium
                </h1>
              </div>
              <p className="max-w-md text-center text-lg text-muted-foreground">
                Design and collaborate on room layouts in real-time with your roommates or friends
              </p>
            </div>

            <div
              className="flex flex-col items-center gap-8 opacity-0 animate-fade-up"
              style={{ animationDelay: "150ms" }}
            >
              <div className="flex flex-col items-center gap-3">
                <Button
                  size="xl"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isCreating ? "Creating..." : "Start Building"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Button>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>or press</span>
                  <Kbd>⇧</Kbd>
                  <Kbd>↵</Kbd>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px w-16 bg-border" />
                <span className="text-sm text-muted-foreground">or join existing</span>
                <div className="h-px w-16 bg-border" />
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    className="w-32 text-center font-mono tracking-widest uppercase"
                    maxLength={6}
                  />
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleJoin}
                    disabled={isJoining || roomCode.length !== 6}
                  >
                    {isJoining ? "Joining..." : "Join"}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>

            <div className="w-full opacity-0 animate-fade-up" style={{ animationDelay: "300ms" }}>
              <RecentRooms />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

