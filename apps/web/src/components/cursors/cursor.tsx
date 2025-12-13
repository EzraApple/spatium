import type { Point } from "@apartment-planner/shared"

type WorldToScreen = (worldX: number, worldY: number) => Point

type CursorProps = {
  color: string
  x: number
  y: number
  worldToScreen: WorldToScreen | null
}

export function Cursor({ color, x, y, worldToScreen }: CursorProps) {
  if (!worldToScreen) return null

  const screenPos = worldToScreen(x, y)
  if (screenPos.x <= 0 || screenPos.y <= 0) return null

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75"
      style={{ left: screenPos.x, top: screenPos.y }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 4L10.5 20L12.5 13.5L19 11.5L4 4Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
