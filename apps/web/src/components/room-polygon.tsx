import type { RoomEntity, Point, WallSegment } from "@apartment-planner/shared"
import { getWallSegments, formatEighths, eighthsToInches } from "@apartment-planner/shared"
import { cn } from "@/lib/utils"

type RoomPolygonProps = {
  room: RoomEntity
  scale: number
  pixelScale: number
  isSelected: boolean
  isMoving: boolean
  isColliding: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function getWallMidpoint(wall: WallSegment): Point {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2,
  }
}

function getWallAngle(wall: WallSegment): number {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  return Math.atan2(dy, dx) * (180 / Math.PI)
}

function getLabelOffset(wall: WallSegment, pixelScale: number): Point {
  const angle = getWallAngle(wall)
  const normalizedAngle = ((angle % 360) + 360) % 360
  const offset = 14 * pixelScale

  if (normalizedAngle >= 45 && normalizedAngle < 135) {
    return { x: offset, y: 0 }
  } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
    return { x: 0, y: -offset }
  } else if (normalizedAngle >= 225 && normalizedAngle < 315) {
    return { x: -offset, y: 0 }
  } else {
    return { x: 0, y: offset }
  }
}

export function RoomPolygon({
  room,
  scale,
  pixelScale,
  isSelected,
  isMoving,
  isColliding,
  onClick,
  onContextMenu,
}: RoomPolygonProps) {
  const scaledVertices = room.vertices.map((v) => ({
    x: (v.x + room.position.x) * scale,
    y: (v.y + room.position.y) * scale,
  }))

  const pathData = scaledVertices.map((v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`).join(" ") + " Z"

  const walls = getWallSegments(room.vertices, room.position)

  const strokeColor = isColliding
    ? "hsl(0 84% 60%)"
    : isSelected
      ? "hsl(221 83% 53%)"
      : "hsl(222 47% 25%)"

  const fillColor = isColliding
    ? "hsl(0 84% 60% / 0.1)"
    : isSelected
      ? "hsl(221 83% 53% / 0.15)"
      : "hsl(214 100% 97% / 0.8)"

  const strokeWidth = (isSelected ? 2 : 1.5) * pixelScale
  const dimensionFontSize = 11 * pixelScale
  const titleFontSize = 13 * pixelScale
  const titleOffset = 10 * pixelScale

  return (
    <g
      className={cn("transition-opacity", isMoving && "opacity-80")}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <path
        d={pathData}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="transition-colors"
      />

      {walls.map((wall, i) => {
        const midpoint = getWallMidpoint(wall)
        const offset = getLabelOffset(wall, pixelScale)
        const lengthInEighths = Math.round(wall.length)
        const displayLength = formatEighths(lengthInEighths)

        const labelX = midpoint.x * scale + offset.x
        const labelY = midpoint.y * scale + offset.y

        const minDisplayLength = eighthsToInches(lengthInEighths) >= 12

        if (!minDisplayLength) return null

        return (
          <text
            key={i}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(222 47% 25%)"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: dimensionFontSize,
              fontWeight: 500,
            }}
            className="pointer-events-none select-none"
          >
            {displayLength}
          </text>
        )
      })}

      <text
        x={scaledVertices.reduce((sum, v) => sum + v.x, 0) / scaledVertices.length}
        y={Math.min(...scaledVertices.map((v) => v.y)) - titleOffset}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="hsl(222 47% 25% / 0.7)"
        style={{
          fontSize: titleFontSize,
          fontWeight: 500,
        }}
        className="pointer-events-none select-none"
      >
        {room.name}
      </text>
    </g>
  )
}
