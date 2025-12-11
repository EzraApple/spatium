type IconProps = {
  className?: string
}

export function RectangleRoomIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="0.5" />
    </svg>
  )
}

export function LShapedRoomIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 5h12v8h6v6H3V5z" />
    </svg>
  )
}

export function BeveledRoomIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 5h12v14H3v-8l6-6z" />
    </svg>
  )
}

export function getRoomShapeIcon(type: "rectangle" | "l-shaped" | "beveled") {
  switch (type) {
    case "rectangle":
      return RectangleRoomIcon
    case "l-shaped":
      return LShapedRoomIcon
    case "beveled":
      return BeveledRoomIcon
  }
}

