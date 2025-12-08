import type { DoorEntity, RoomEntity, Point, HingeSide } from "@apartment-planner/shared"
import { getDoorAbsolutePosition, getDoorGeometry } from "@apartment-planner/shared"
import { cn } from "@/lib/utils"

type DoorShapeProps = {
  door: DoorEntity
  room: RoomEntity
  scale: number
  pixelScale: number
  isSelected: boolean
  isGhost?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
}

const DOOR_COLOR = "#8B4513"
const SWING_COLOR = "hsl(221 83% 53% / 0.15)"
const SWING_COLOR_SELECTED = "hsl(221 83% 53% / 0.25)"

export function DoorShape({
  door,
  room,
  scale,
  pixelScale,
  isSelected,
  isGhost = false,
  onMouseDown,
}: DoorShapeProps) {
  const result = getDoorAbsolutePosition(door, room.vertices, room.position)
  if (!result) return null

  const { geometry } = result

  const doorStart = {
    x: geometry.doorStart.x * scale,
    y: geometry.doorStart.y * scale,
  }
  const doorEnd = {
    x: geometry.doorEnd.x * scale,
    y: geometry.doorEnd.y * scale,
  }
  const hingePoint = {
    x: geometry.hingePoint.x * scale,
    y: geometry.hingePoint.y * scale,
  }
  const swingStart = {
    x: geometry.swingStartPoint.x * scale,
    y: geometry.swingStartPoint.y * scale,
  }
  const swingEnd = {
    x: geometry.swingEndPoint.x * scale,
    y: geometry.swingEndPoint.y * scale,
  }
  const swingRadius = geometry.swingRadius * scale

  const swingArcPath = `M ${hingePoint.x} ${hingePoint.y} L ${swingStart.x} ${swingStart.y} A ${swingRadius} ${swingRadius} 0 0 ${geometry.sweepFlag} ${swingEnd.x} ${swingEnd.y} Z`

  const strokeColor = isSelected ? "hsl(221 83% 53%)" : DOOR_COLOR
  const strokeWidth = (isSelected ? 3 : 2.5) * pixelScale
  const swingFill = isSelected ? SWING_COLOR_SELECTED : SWING_COLOR

  const hingeRadius = 3 * pixelScale

  return (
    <g
      className={cn(
        "transition-opacity",
        isGhost && "opacity-60",
        onMouseDown && "cursor-pointer"
      )}
      onMouseDown={onMouseDown}
    >
      <path
        d={swingArcPath}
        fill={swingFill}
        stroke="none"
        className="transition-colors"
      />

      <line
        x1={doorStart.x}
        y1={doorStart.y}
        x2={doorEnd.x}
        y2={doorEnd.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="transition-colors"
      />

      <circle
        cx={hingePoint.x}
        cy={hingePoint.y}
        r={hingeRadius}
        fill={strokeColor}
        className="transition-colors"
      />
    </g>
  )
}

type GhostDoorProps = {
  wallStart: Point
  wallEnd: Point
  positionOnWall: number
  doorWidth: number
  hingeSide: HingeSide
  roomVertices: Point[]
  roomPosition: Point
  scale: number
  pixelScale: number
}

export function GhostDoor({
  wallStart,
  wallEnd,
  positionOnWall,
  doorWidth,
  hingeSide,
  roomVertices,
  roomPosition,
  scale,
  pixelScale,
}: GhostDoorProps) {
  const geometry = getDoorGeometry(
    wallStart,
    wallEnd,
    positionOnWall,
    doorWidth,
    hingeSide,
    roomVertices,
    roomPosition
  )

  const doorStart = {
    x: geometry.doorStart.x * scale,
    y: geometry.doorStart.y * scale,
  }
  const doorEnd = {
    x: geometry.doorEnd.x * scale,
    y: geometry.doorEnd.y * scale,
  }
  const hingePoint = {
    x: geometry.hingePoint.x * scale,
    y: geometry.hingePoint.y * scale,
  }
  const swingStart = {
    x: geometry.swingStartPoint.x * scale,
    y: geometry.swingStartPoint.y * scale,
  }
  const swingEnd = {
    x: geometry.swingEndPoint.x * scale,
    y: geometry.swingEndPoint.y * scale,
  }
  const swingRadius = geometry.swingRadius * scale

  const swingArcPath = `M ${hingePoint.x} ${hingePoint.y} L ${swingStart.x} ${swingStart.y} A ${swingRadius} ${swingRadius} 0 0 ${geometry.sweepFlag} ${swingEnd.x} ${swingEnd.y} Z`

  const strokeWidth = 2.5 * pixelScale
  const hingeRadius = 3 * pixelScale

  return (
    <g className="opacity-60 pointer-events-none">
      <path
        d={swingArcPath}
        fill={SWING_COLOR}
        stroke="none"
      />

      <line
        x1={doorStart.x}
        y1={doorStart.y}
        x2={doorEnd.x}
        y2={doorEnd.y}
        stroke={DOOR_COLOR}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      <circle
        cx={hingePoint.x}
        cy={hingePoint.y}
        r={hingeRadius}
        fill={DOOR_COLOR}
      />
    </g>
  )
}

