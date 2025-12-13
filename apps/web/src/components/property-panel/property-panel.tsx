import type { RoomEntity, FurnitureEntity, DoorEntity } from "@apartment-planner/shared"
import { RoomProperties } from "./room-properties"
import { FurnitureProperties } from "./furniture-properties"
import { DoorProperties } from "./door-properties"

type PropertyPanelProps = {
  selectedRoom: RoomEntity | null
  selectedFurniture: FurnitureEntity | null
  selectedDoor: DoorEntity | null
  onRoomUpdate: (room: RoomEntity) => void
  onFurnitureUpdate: (furniture: FurnitureEntity) => void
  onDoorUpdate: (door: DoorEntity) => void
  onRoomDelete: (roomId: string) => void
  onFurnitureDelete: (furnitureId: string) => void
  onFurniturePickUp: (furnitureId: string) => void
  onDoorDelete: (doorId: string) => void
}

export function PropertyPanel({
  selectedRoom,
  selectedFurniture,
  selectedDoor,
  onRoomUpdate,
  onFurnitureUpdate,
  onDoorUpdate,
  onRoomDelete,
  onFurnitureDelete,
  onFurniturePickUp,
  onDoorDelete,
}: PropertyPanelProps) {
  if (selectedDoor) {
    return (
      <DoorProperties
        door={selectedDoor}
        onUpdate={onDoorUpdate}
        onDelete={onDoorDelete}
      />
    )
  }

  if (selectedRoom) {
    return (
      <RoomProperties
        room={selectedRoom}
        onUpdate={onRoomUpdate}
        onDelete={onRoomDelete}
      />
    )
  }

  if (selectedFurniture) {
    return (
      <FurnitureProperties
        furniture={selectedFurniture}
        onUpdate={onFurnitureUpdate}
        onDelete={onFurnitureDelete}
        onPickUp={onFurniturePickUp}
      />
    )
  }

  return null
}

