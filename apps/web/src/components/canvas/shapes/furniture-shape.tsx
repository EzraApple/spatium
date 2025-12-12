import type { FurnitureEntity, Point } from "@apartment-planner/shared"
import { furnitureShapeToVertices } from "@apartment-planner/shared"
import { cn } from "@/lib/utils"

type FurnitureShapeProps = {
  furniture: FurnitureEntity
  roomPosition: Point
  scale: number
  pixelScale: number
  isSelected: boolean
  isDragging: boolean
  isRoomDragging: boolean
  isColliding: boolean
  onMouseDown: (e: React.MouseEvent) => void
}

const DESK_COLOR = "#C4A484"
const TABLE_COLOR = "#5D4037"
const COUCH_COLOR = "#4A4A4A"
const FRIDGE_COLOR = "#D3D3D3"
const BED_COLOR = "#94A3B8"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getDefaultFurnitureColor(furnitureType: FurnitureEntity["furnitureType"]): string {
  switch (furnitureType) {
    case "square-table":
    case "circle-table":
      return TABLE_COLOR
    case "couch":
    case "l-shaped-couch":
      return COUCH_COLOR
    case "fridge":
      return FRIDGE_COLOR
    case "bed":
      return BED_COLOR
    default:
      return DESK_COLOR
  }
}

export function FurnitureShape({
  furniture,
  roomPosition,
  scale,
  pixelScale,
  isSelected,
  isDragging,
  isRoomDragging,
  isColliding,
  onMouseDown,
}: FurnitureShapeProps) {
  const baseColor = furniture.color ?? getDefaultFurnitureColor(furniture.furnitureType)
  
  const strokeColor = isColliding
    ? "hsl(var(--destructive))"
    : isSelected
      ? "hsl(var(--primary))"
      : "hsl(var(--border))"

  const fillColor = isColliding ? "hsl(var(--destructive))" : baseColor
  const fillOpacity = isColliding ? 0.22 : isSelected ? 0.62 : 0.48

  const strokeWidth = (isSelected ? 2.25 : 1.75) * pixelScale
  const detailStrokeWidth = clamp(strokeWidth * 0.65, 0.9 * pixelScale, 2.1 * pixelScale)
  const detailStrokeOpacity = 0.55

  const translateX = (roomPosition.x + furniture.position.x) * scale
  const translateY = (roomPosition.y + furniture.position.y) * scale

  if (furniture.shapeTemplate.type === "circle") {
    const radius = furniture.shapeTemplate.radius * scale

    return (
      <g
        transform={`translate(${translateX}, ${translateY})`}
        style={{ transition: "transform 60ms ease-out" }}
        className={cn("cursor-pointer", isDragging && "opacity-80")}
        onMouseDown={onMouseDown}
      >
        <g transform={`rotate(${furniture.rotation} ${radius} ${radius})`}>
          <circle
            cx={radius}
            cy={radius}
            r={radius}
            fill={fillColor}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="transition-colors"
          />
        </g>
      </g>
    )
  }

  const vertices = furnitureShapeToVertices(furniture.shapeTemplate)
  const scaledVertices = vertices.map((v) => ({
    x: v.x * scale,
    y: v.y * scale,
  }))

  const pathData = scaledVertices.map((v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`).join(" ") + " Z"

  const minX = Math.min(...scaledVertices.map((v) => v.x))
  const maxX = Math.max(...scaledVertices.map((v) => v.x))
  const minY = Math.min(...scaledVertices.map((v) => v.y))
  const maxY = Math.max(...scaledVertices.map((v) => v.y))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const boxWidth = maxX - minX
  const boxHeight = maxY - minY

  const clipId = `furniture-clip-${furniture.id}`

  const inset = clamp(Math.min(boxWidth, boxHeight) * 0.12, 6 * pixelScale, 22 * pixelScale)
  const innerX = minX + inset
  const innerY = minY + inset
  const innerW = Math.max(0, boxWidth - inset * 2)
  const innerH = Math.max(0, boxHeight - inset * 2)

  return (
    <g
      transform={`translate(${translateX}, ${translateY})`}
      style={{ transition: "transform 60ms ease-out" }}
      className={cn("cursor-pointer", isDragging && "opacity-80")}
      onMouseDown={onMouseDown}
    >
      <g transform={`rotate(${furniture.rotation} ${centerX} ${centerY})`}>
        <defs>
          <clipPath id={clipId}>
            <path d={pathData} />
          </clipPath>
        </defs>
        <path
          d={pathData}
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-colors"
        />

        {furniture.furnitureType === "bed" ? (
          <g clipPath={`url(#${clipId})`}>
            <rect
              x={innerX}
              y={minY + clamp(inset * 0.35, 3 * pixelScale, 10 * pixelScale)}
              width={innerW}
              height={clamp(Math.min(boxWidth, boxHeight) * 0.22, 10 * pixelScale, 22 * pixelScale)}
              fill="hsl(var(--card))"
              fillOpacity={0.9}
            />
            <line
              x1={innerX}
              y1={
                minY +
                clamp(inset * 0.35, 3 * pixelScale, 10 * pixelScale) +
                clamp(Math.min(boxWidth, boxHeight) * 0.22, 10 * pixelScale, 22 * pixelScale)
              }
              x2={innerX + innerW}
              y2={
                minY +
                clamp(inset * 0.35, 3 * pixelScale, 10 * pixelScale) +
                clamp(Math.min(boxWidth, boxHeight) * 0.22, 10 * pixelScale, 22 * pixelScale)
              }
              stroke={strokeColor}
              strokeWidth={detailStrokeWidth}
              strokeOpacity={detailStrokeOpacity}
            />
          </g>
        ) : null}
      </g>
    </g>
  )
}

