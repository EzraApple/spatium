import { useRef, useCallback } from "react"
import type { FurnitureEntity, Point } from "@apartment-planner/shared"
import { furnitureShapeToVertices } from "@apartment-planner/shared"
import { cn } from "@/lib/utils"

type InventoryCardProps = {
  furniture: FurnitureEntity
  isDragging: boolean
  onDragStart: (furnitureId: string, cardRect: DOMRect) => void
}

const CARD_SIZE = 80
const PREVIEW_PADDING = 12

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

export function InventoryCard({ furniture, isDragging, onDragStart }: InventoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const baseColor = furniture.color ?? getDefaultFurnitureColor(furniture.furnitureType)
  
  const bounds = getFurnitureBounds(furniture)
  const maxDim = Math.max(bounds.width, bounds.height)
  const previewSize = CARD_SIZE - PREVIEW_PADDING * 2
  const scale = previewSize / maxDim

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (cardRef.current) {
      onDragStart(furniture.id, cardRef.current.getBoundingClientRect())
    }
  }, [furniture.id, onDragStart])

  const renderPreview = () => {
    const offsetX = (previewSize - bounds.width * scale) / 2
    const offsetY = (previewSize - bounds.height * scale) / 2

    if (furniture.shapeTemplate.type === "circle") {
      const radius = furniture.shapeTemplate.radius * scale
      return (
        <svg width={previewSize} height={previewSize} className="overflow-visible">
          <circle
            cx={previewSize / 2}
            cy={previewSize / 2}
            r={radius}
            fill={baseColor}
            fillOpacity={0.6}
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
          />
        </svg>
      )
    }

    const vertices = furnitureShapeToVertices(furniture.shapeTemplate)
    const scaledVertices = vertices.map((v) => ({
      x: v.x * scale + offsetX,
      y: v.y * scale + offsetY,
    }))
    const pathData = scaledVertices.map((v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`).join(" ") + " Z"

    return (
      <svg width={previewSize} height={previewSize} className="overflow-visible">
        <path
          d={pathData}
          fill={baseColor}
          fillOpacity={0.6}
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
        />
      </svg>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-foreground truncate max-w-[88px] text-center">
        {furniture.name}
      </span>
      <div
        ref={cardRef}
        className={cn(
          "panel-neo bg-card flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity",
          isDragging && "opacity-40"
        )}
        style={{ width: CARD_SIZE, height: CARD_SIZE }}
        onMouseDown={handleMouseDown}
      >
        {renderPreview()}
      </div>
    </div>
  )
}

