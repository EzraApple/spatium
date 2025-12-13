import { useRef, useEffect, useState } from "react"
import type { FurnitureEntity } from "@apartment-planner/shared"
import { InventoryCard } from "./inventory-card"
import { Package } from "lucide-react"

type InventorySheetProps = {
  furniture: FurnitureEntity[]
  draggingFurnitureId: string | null
  onDragStart: (furnitureId: string, cardRect: DOMRect) => void
}

const SHEET_HEIGHT = 160

export function InventorySheet({
  furniture,
  draggingFurnitureId,
  onDragStart,
}: InventorySheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  const shouldShow = furniture.length > 0

  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [shouldShow])

  if (!isVisible && !shouldShow) return null

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-0 left-0 right-0 z-30 panel-neo bg-card border-t-2 border-x-0 border-b-0 rounded-none transition-transform duration-300 ease-out"
      style={{
        height: SHEET_HEIGHT,
        transform: shouldShow ? "translateY(0)" : `translateY(${SHEET_HEIGHT}px)`,
      }}
    >
      <div className="h-full px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Inventory</span>
          {furniture.length > 0 && (
            <span className="text-xs text-muted-foreground">({furniture.length})</span>
          )}
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-1">
          {furniture.map((f) => (
            <InventoryCard
              key={f.id}
              furniture={f}
              isDragging={draggingFurnitureId === f.id}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export { SHEET_HEIGHT }
