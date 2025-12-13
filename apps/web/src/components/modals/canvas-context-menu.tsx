import { useEffect, useRef, useState } from "react"
import { Home, Armchair, DoorOpen, Package } from "lucide-react"
import type { RoomEntity, FurnitureEntity } from "@apartment-planner/shared"

type CanvasContextMenuProps = {
  x: number
  y: number
  targetRoom: RoomEntity | null
  targetFurniture: FurnitureEntity | null
  onAddRoom: () => void
  onAddFurniture: (roomId: string) => void
  onAddDoor: (roomId: string) => void
  onPickUpFurniture: (furnitureId: string) => void
  onClose: () => void
}

export function CanvasContextMenu({
  x,
  y,
  targetRoom,
  targetFurniture,
  onAddRoom,
  onAddFurniture,
  onAddDoor,
  onPickUpFurniture,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsReady(true)
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  useEffect(() => {
    if (!isReady) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isReady, onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border-2 border-foreground bg-card p-1 text-foreground shadow-[0_6px_0_hsl(var(--shadow-color))] animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      <button
        className="focus-ring relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          onAddRoom()
          onClose()
        }}
      >
        <Home className="h-4 w-4" />
        Add Room
      </button>
      {targetRoom && !targetFurniture && (
        <>
          <button
            className="focus-ring relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onAddFurniture(targetRoom.id)
              onClose()
            }}
          >
            <Armchair className="h-4 w-4" />
            Add Furniture to {targetRoom.name}
          </button>
          <button
            className="focus-ring relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onAddDoor(targetRoom.id)
              onClose()
            }}
          >
            <DoorOpen className="h-4 w-4" />
            Add Door to {targetRoom.name}
          </button>
        </>
      )}
      {targetFurniture && (
        <button
          className="focus-ring relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            onPickUpFurniture(targetFurniture.id)
            onClose()
          }}
        >
          <Package className="h-4 w-4" />
          Pick Up {targetFurniture.name}
        </button>
      )}
    </div>
  )
}

