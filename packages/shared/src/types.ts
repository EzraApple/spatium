import type { RoomEntity, FurnitureEntity, DoorEntity, LayoutDocument, Point } from "./entities"

export type ClientMessage =
  | { type: "cursor-move"; x: number; y: number }
  | { type: "cursor-leave" }
  | { type: "cursor-click"; x: number; y: number }
  | { type: "room-add"; room: RoomEntity }
  | { type: "room-update"; room: RoomEntity }
  | { type: "room-delete"; roomId: string }
  | { type: "room-move"; roomId: string; position: Point }
  | { type: "furniture-add"; furniture: FurnitureEntity }
  | { type: "furniture-update"; furniture: FurnitureEntity }
  | { type: "furniture-delete"; furnitureId: string }
  | { type: "furniture-move"; furnitureId: string; position: Point; roomId: string }
  | { type: "door-add"; door: DoorEntity }
  | { type: "door-update"; door: DoorEntity }
  | { type: "door-delete"; doorId: string }

export type ServerMessage =
  | { type: "sync"; clients: Record<string, ClientState> }
  | { type: "cursor-update"; clientId: string; x: number; y: number }
  | { type: "client-join"; clientId: string; color: string }
  | { type: "client-leave"; clientId: string }
  | { type: "cursor-click"; clientId: string; x: number; y: number; color: string }
  | { type: "layout-sync"; document: LayoutDocument }
  | { type: "room-added"; room: RoomEntity; clientId: string }
  | { type: "room-updated"; room: RoomEntity; clientId: string }
  | { type: "room-deleted"; roomId: string; clientId: string }
  | { type: "room-moved"; roomId: string; position: Point; clientId: string }
  | { type: "furniture-added"; furniture: FurnitureEntity; clientId: string }
  | { type: "furniture-updated"; furniture: FurnitureEntity; clientId: string }
  | { type: "furniture-deleted"; furnitureId: string; clientId: string }
  | { type: "furniture-moved"; furnitureId: string; position: Point; roomId: string; clientId: string }
  | { type: "door-added"; door: DoorEntity; clientId: string }
  | { type: "door-updated"; door: DoorEntity; clientId: string }
  | { type: "door-deleted"; doorId: string; clientId: string }

export type ClientState = {
  color: string
  x: number
  y: number
}

export type Layout = {
  id: string
  name: string
  roomCode: string
  data: LayoutDocument
}
