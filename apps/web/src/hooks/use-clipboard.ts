import { useState, useCallback } from "react"
import { v4 as uuid } from "uuid"
import type {
  RoomEntity,
  FurnitureEntity,
  DoorEntity,
  Entity,
  Point,
} from "@apartment-planner/shared"

type ClipboardItem =
  | { type: "room"; entity: RoomEntity }
  | { type: "furniture"; entity: FurnitureEntity }
  | { type: "door"; entity: DoorEntity }

const PASTE_OFFSET = 50

type UseClipboardProps = {
  rooms: RoomEntity[]
  furniture: FurnitureEntity[]
  doors: DoorEntity[]
  selectedId: string | null
  selectedType: "room" | "furniture" | "door" | null
  addRoom: (room: RoomEntity) => void
  addFurniture: (furniture: FurnitureEntity) => void
  addDoor: (door: DoorEntity) => void
  select: (id: string, type: "room" | "furniture" | "door") => void
}

export function useClipboard({
  rooms,
  furniture,
  doors,
  selectedId,
  selectedType,
  addRoom,
  addFurniture,
  addDoor,
  select,
}: UseClipboardProps) {
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null)

  const getSelectedEntity = useCallback((): Entity | null => {
    if (!selectedId || !selectedType) return null

    switch (selectedType) {
      case "room":
        return rooms.find((r) => r.id === selectedId) ?? null
      case "furniture":
        return furniture.find((f) => f.id === selectedId) ?? null
      case "door":
        return doors.find((d) => d.id === selectedId) ?? null
    }
  }, [selectedId, selectedType, rooms, furniture, doors])

  const copy = useCallback(() => {
    const entity = getSelectedEntity()
    if (!entity) return false

    setClipboardItem({ type: entity.type, entity } as ClipboardItem)
    return true
  }, [getSelectedEntity])

  const paste = useCallback(() => {
    if (!clipboardItem) return false

    switch (clipboardItem.type) {
      case "room": {
        const newRoom: RoomEntity = {
          ...clipboardItem.entity,
          id: uuid(),
          name: `${clipboardItem.entity.name} (copy)`,
          position: {
            x: clipboardItem.entity.position.x + PASTE_OFFSET,
            y: clipboardItem.entity.position.y + PASTE_OFFSET,
          },
        }
        addRoom(newRoom)
        select(newRoom.id, "room")
        return true
      }
      case "furniture": {
        const newFurniture: FurnitureEntity = {
          ...clipboardItem.entity,
          id: uuid(),
          name: `${clipboardItem.entity.name} (copy)`,
          position: {
            x: clipboardItem.entity.position.x + PASTE_OFFSET,
            y: clipboardItem.entity.position.y + PASTE_OFFSET,
          },
        }
        addFurniture(newFurniture)
        select(newFurniture.id, "furniture")
        return true
      }
      case "door": {
        const newDoor: DoorEntity = {
          ...clipboardItem.entity,
          id: uuid(),
          name: `${clipboardItem.entity.name} (copy)`,
        }
        addDoor(newDoor)
        select(newDoor.id, "door")
        return true
      }
    }
  }, [clipboardItem, addRoom, addFurniture, addDoor, select])

  const duplicate = useCallback(() => {
    const entity = getSelectedEntity()
    if (!entity) return false

    switch (entity.type) {
      case "room": {
        const newRoom: RoomEntity = {
          ...entity,
          id: uuid(),
          name: `${entity.name} (copy)`,
          position: {
            x: entity.position.x + PASTE_OFFSET,
            y: entity.position.y + PASTE_OFFSET,
          },
        }
        addRoom(newRoom)
        select(newRoom.id, "room")
        return true
      }
      case "furniture": {
        const newFurniture: FurnitureEntity = {
          ...entity,
          id: uuid(),
          name: `${entity.name} (copy)`,
          position: {
            x: entity.position.x + PASTE_OFFSET,
            y: entity.position.y + PASTE_OFFSET,
          },
        }
        addFurniture(newFurniture)
        select(newFurniture.id, "furniture")
        return true
      }
      case "door": {
        const newDoor: DoorEntity = {
          ...entity,
          id: uuid(),
          name: `${entity.name} (copy)`,
        }
        addDoor(newDoor)
        select(newDoor.id, "door")
        return true
      }
    }
  }, [getSelectedEntity, addRoom, addFurniture, addDoor, select])

  return {
    clipboardItem,
    hasClipboard: clipboardItem !== null,
    copy,
    paste,
    duplicate,
  }
}

