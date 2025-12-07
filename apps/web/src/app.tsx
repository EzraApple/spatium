import { useCursorSync } from "@/hooks/use-cursor-sync"
import { CursorCanvas } from "@/components/cursor-canvas"
import { ClickRipple } from "@/components/click-ripple"
import { ConnectionStatus } from "@/components/connection-status"

export function App() {
  const { cursors, clicks, status, myColor, clientCount, sendCursorMove, sendCursorLeave, sendClick } =
    useCursorSync()

  const handleMouseMove = (e: React.MouseEvent) => {
    sendCursorMove(e.clientX, e.clientY)
  }

  const handleClick = (e: React.MouseEvent) => {
    sendClick(e.clientX, e.clientY)
  }

  return (
    <div
      className="relative h-full w-full bg-zinc-950"
      onMouseMove={handleMouseMove}
      onMouseLeave={sendCursorLeave}
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />

      <div className="absolute inset-0 opacity-20">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative flex h-full flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          Spatium
        </h1>
        <p className="text-lg text-zinc-500">
          Move your cursor around. Open multiple tabs to see others.
        </p>
      </div>

      <CursorCanvas cursors={cursors} />
      {clicks.map((click) => (
        <ClickRipple key={click.id} click={click} />
      ))}
      <ConnectionStatus status={status} clientCount={clientCount} myColor={myColor} />
    </div>
  )
}

