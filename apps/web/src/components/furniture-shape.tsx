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
  isColliding: boolean
  onMouseDown: (e: React.MouseEvent) => void
}

const DESK_COLOR = "#C4A484"
const TABLE_COLOR = "#5D4037"
const COUCH_COLOR = "#4A4A4A"
const FRIDGE_COLOR = "#D3D3D3"

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
  isColliding,
  onMouseDown,
}: FurnitureShapeProps) {
  const baseColor = furniture.color ?? getDefaultFurnitureColor(furniture.furnitureType)
  
  const strokeColor = isColliding
    ? "hsl(0 84% 60%)"
    : isSelected
      ? "hsl(221 83% 53%)"
      : baseColor

  const fillColor = isColliding
    ? "hsl(0 84% 60% / 0.3)"
    : isSelected
      ? `${baseColor}CC`
      : `${baseColor}99`

  const strokeWidth = (isSelected ? 2 : 1) * pixelScale

  const absoluteX = (roomPosition.x + furniture.position.x) * scale
  const absoluteY = (roomPosition.y + furniture.position.y) * scale

  if (furniture.shapeTemplate.type === "circle") {
    const radius = furniture.shapeTemplate.radius * scale
    const cx = absoluteX + radius
    const cy = absoluteY + radius

    return (
      <g
        className={cn("transition-opacity cursor-pointer", isDragging && "opacity-80")}
        onMouseDown={onMouseDown}
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-colors"
        />
      </g>
    )
  }

  const vertices = furnitureShapeToVertices(furniture.shapeTemplate)
  const scaledVertices = vertices.map((v) => ({
    x: absoluteX + v.x * scale,
    y: absoluteY + v.y * scale,
  }))

  const pathData = scaledVertices.map((v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`).join(" ") + " Z"

  return (
    <g
      className={cn("transition-opacity cursor-pointer", isDragging && "opacity-80")}
      onMouseDown={onMouseDown}
    >
      <path
        d={pathData}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="transition-colors"
      />
    </g>
  )
}

