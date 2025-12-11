import type { ClickEvent } from "@/hooks/use-cursor-sync"

type ClickRippleProps = {
  click: ClickEvent
}

export function ClickRipple({ click }: ClickRippleProps) {
  const pixelX = click.x * window.innerWidth
  const pixelY = click.y * window.innerHeight

  return (
    <div
      className="pointer-events-none fixed z-40"
      style={{ left: pixelX, top: pixelY }}
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

