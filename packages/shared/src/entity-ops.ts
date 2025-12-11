import type { Entity, RoomEntity, FurnitureEntity, DoorEntity, LayoutDocument, Point } from "./entities"

export type EntityType = "room" | "furniture" | "door"

export function addEntity<T extends Entity>(entities: Entity[], entity: T): Entity[] {
  return [...entities, entity]
}

export function updateEntity<T extends Entity>(
  entities: Entity[],
  entityType: EntityType,
  entityId: string,
  updater: (entity: T) => T
): Entity[] {
  return entities.map((e) => {
    if (e.type === entityType && e.id === entityId) {
      return updater(e as T)
    }
    return e
  })
}

export function deleteEntity(
  entities: Entity[],
  entityType: EntityType,
  entityId: string
): Entity[] {
  return entities.filter((e) => !(e.type === entityType && e.id === entityId))
}

export function deleteRoomWithContents(entities: Entity[], roomId: string): Entity[] {
  return entities.filter((e) => {
    if (e.type === "room" && e.id === roomId) return false
    if (e.type === "furniture" && e.roomId === roomId) return false
    if (e.type === "door" && e.roomId === roomId) return false
    return true
  })
}

export function moveRoom(entities: Entity[], roomId: string, position: Point): Entity[] {
  return entities.map((e) => {
    if (e.type === "room" && e.id === roomId) {
      return { ...e, position }
    }
    return e
  })
}

export function moveFurniture(
  entities: Entity[],
  furnitureId: string,
  position: Point,
  roomId: string
): Entity[] {
  return entities.map((e) => {
    if (e.type === "furniture" && e.id === furnitureId) {
      return { ...e, position, roomId }
    }
    return e
  })
}

export function moveDoor(
  entities: Entity[],
  doorId: string,
  wallIndex: number,
  positionOnWall: number
): Entity[] {
  return entities.map((e) => {
    if (e.type === "door" && e.id === doorId) {
      return { ...e, wallIndex, positionOnWall }
    }
    return e
  })
}

export function getRooms(doc: LayoutDocument): RoomEntity[] {
  return doc.entities.filter((e): e is RoomEntity => e.type === "room")
}

export function getFurniture(doc: LayoutDocument): FurnitureEntity[] {
  return doc.entities.filter((e): e is FurnitureEntity => e.type === "furniture")
}

export function getDoors(doc: LayoutDocument): DoorEntity[] {
  return doc.entities.filter((e): e is DoorEntity => e.type === "door")
}

export function getFurnitureByRoom(doc: LayoutDocument, roomId: string): FurnitureEntity[] {
  return getFurniture(doc).filter((f) => f.roomId === roomId)
}

export function getDoorsByRoom(doc: LayoutDocument, roomId: string): DoorEntity[] {
  return getDoors(doc).filter((d) => d.roomId === roomId)
}

