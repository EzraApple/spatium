import type { FurnitureEntity, Point } from "@apartment-planner/shared"
import { furnitureShapeToVertices } from "@apartment-planner/shared"

type InventoryDragPreviewProps = {
  furniture: FurnitureEntity
  position: Point
  canvasScale: number
}

const DESK_COLOR = "#C4A484"
const TABLE_COLOR = "#5D4037"
const COUCH_COLOR = "#4A4A4A"
const FRIDGE_COLOR = "#D3D3D3"
const BED_COLOR = "#94A3B8"

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

function getFurnitureBounds(furniture: FurnitureEntity): { width: number; height: number } {
  if (furniture.shapeTemplate.type === "circle") {
    const diameter = furniture.shapeTemplate.radius * 2
    return { width: diameter, height: diameter }
  }
  const vertices = furnitureShapeToVertices(furniture.shapeTemplate)
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

export function InventoryDragPreview({ furniture, position, canvasScale }: InventoryDragPreviewProps) {
  const baseColor = furniture.color ?? getDefaultFurnitureColor(furniture.furnitureType)
  
  const bounds = getFurnitureBounds(furniture)
  const svgWidth = bounds.width * canvasScale
  const svgHeight = bounds.height * canvasScale

  const renderPreview = () => {
    if (furniture.shapeTemplate.type === "circle") {
      const radius = furniture.shapeTemplate.radius * canvasScale
      const diameter = radius * 2
      return (
        <svg width={diameter} height={diameter} className="overflow-visible">
          <circle
            cx={radius}
            cy={radius}
            r={radius}
            fill={baseColor}
            fillOpacity={0.7}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
        </svg>
      )
    }

    const vertices = furnitureShapeToVertices(furniture.shapeTemplate)
    const scaledVertices = vertices.map((v) => ({
      x: v.x * canvasScale,
      y: v.y * canvasScale,
    }))
    const pathData = scaledVertices.map((v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`).join(" ") + " Z"

    return (
      <svg width={svgWidth} height={svgHeight} className="overflow-visible">
        <path
          d={pathData}
          fill={baseColor}
          fillOpacity={0.7}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
      </svg>
    )
  }

  const previewWidth = furniture.shapeTemplate.type === "circle" 
    ? furniture.shapeTemplate.radius * 2 * canvasScale 
    : svgWidth
  const previewHeight = furniture.shapeTemplate.type === "circle"
    ? furniture.shapeTemplate.radius * 2 * canvasScale
    : svgHeight

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: position.x - previewWidth / 2,
        top: position.y - previewHeight / 2,
      }}
    >
      <div className="drop-shadow-lg">
        {renderPreview()}
      </div>
    </div>
  )
}

