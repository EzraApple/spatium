type CursorProps = {
  color: string
  x: number
  y: number
}

export function Cursor({ color, x, y }: CursorProps) {
  if (x <= 0 || y <= 0) return null

  const pixelX = x * window.innerWidth
  const pixelY = y * window.innerHeight

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75"
      style={{ left: pixelX, top: pixelY }}
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

