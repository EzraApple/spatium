import { useEffect, useRef, useState } from "react"
import { Home, Armchair, DoorOpen } from "lucide-react"
import type { RoomEntity } from "@apartment-planner/shared"

type CanvasContextMenuProps = {
  x: number
  y: number
  targetRoom: RoomEntity | null
  onAddRoom: () => void
  onAddFurniture: (roomId: string) => void
  onAddDoor: (roomId: string) => void
  onClose: () => void
}

export function CanvasContextMenu({
  x,
  y,
  targetRoom,
  onAddRoom,
  onAddFurniture,
  onAddDoor,
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
      className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      <button
        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          onAddRoom()
          onClose()
        }}
      >
        <Home className="h-4 w-4" />
        Add Room
      </button>
      {targetRoom && (
        <>
          <button
            className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onAddFurniture(targetRoom.id)
              onClose()
            }}
          >
            <Armchair className="h-4 w-4" />
            Add Furniture to {targetRoom.name}
          </button>
          <button
            className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
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
    </div>
  )
}
