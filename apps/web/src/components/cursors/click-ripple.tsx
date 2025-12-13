import type { ClickEvent } from "@/hooks/use-cursor-sync"
import type { Point } from "@apartment-planner/shared"

type WorldToScreen = (worldX: number, worldY: number) => Point

type ClickRippleProps = {
  click: ClickEvent
  worldToScreen: WorldToScreen | null
}

export function ClickRipple({ click, worldToScreen }: ClickRippleProps) {
  if (!worldToScreen) return null

  const screenPos = worldToScreen(click.x, click.y)

  return (
    <div
      className="pointer-events-none fixed z-40"
      style={{ left: screenPos.x, top: screenPos.y }}
    >
      <div
        className="ripple-ring absolute left-0 top-0 rounded-full border-[3px]"
        style={{ borderColor: click.color }}
      />
      <div
        className="ripple-ring-delayed absolute left-0 top-0 rounded-full border-2 opacity-60"
        style={{ borderColor: click.color }}
      />
    </div>
  )
}
