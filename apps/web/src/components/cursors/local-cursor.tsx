type CursorType = "pointer" | "grab" | "grabbing" | "crosshair"

type LocalCursorProps = {
  color: string | null
  x: number
  y: number
  cursorType?: CursorType
}

function PointerCursor({ color }: { color: string }) {
  return (
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
  )
}

function GrabCursor({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 13V9.5C8 8.67 8.67 8 9.5 8C10.33 8 11 8.67 11 9.5V13"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 11V8.5C11 7.67 11.67 7 12.5 7C13.33 7 14 7.67 14 8.5V13"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 10.5V9C14 8.17 14.67 7.5 15.5 7.5C16.33 7.5 17 8.17 17 9V16C17 18.21 15.21 20 13 20H11.5C9.29 20 7.5 18.21 7.5 16V12.5"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13V11.5C8 10.67 7.33 10 6.5 10C5.67 10 5 10.67 5 11.5V14C5 17.31 7.69 20 11 20"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GrabbingCursor({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 14V11.5C8 10.67 8.67 10 9.5 10C10.33 10 11 10.67 11 11.5V14"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 12V10.5C11 9.67 11.67 9 12.5 9C13.33 9 14 9.67 14 10.5V14"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 12V11C14 10.17 14.67 9.5 15.5 9.5C16.33 9.5 17 10.17 17 11V16C17 18.21 15.21 20 13 20H11.5C9.29 20 7.5 18.21 7.5 16V13.5"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 14V12.5C8 11.67 7.33 11 6.5 11C5.67 11 5 11.67 5 12.5V14C5 17.31 7.69 20 11 20"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CrosshairCursor({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" />
      <line x1="12" y1="2" x2="12" y2="6" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="6" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="6" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="12" x2="22" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function LocalCursor({ color, x, y, cursorType = "pointer" }: LocalCursorProps) {
  if (!color || x <= 0 || y <= 0) return null

  const offsetX = cursorType === "crosshair" ? -12 : 0
  const offsetY = cursorType === "crosshair" ? -12 : 0

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left: x + offsetX, top: y + offsetY }}
    >
      {cursorType === "pointer" && <PointerCursor color={color} />}
      {cursorType === "grab" && <GrabCursor color={color} />}
      {cursorType === "grabbing" && <GrabbingCursor color={color} />}
      {cursorType === "crosshair" && <CrosshairCursor color={color} />}
    </div>
  )
}

