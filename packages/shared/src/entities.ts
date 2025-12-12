export type Point = {
  x: number
  y: number
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export type RectangleTemplate = {
  type: "rectangle"
  width: number
  height: number
}

export type LShapedTemplate = {
  type: "l-shaped"
  width: number
  height: number
  cutWidth: number
  cutHeight: number
  cutCorner: Corner
}

export type BeveledTemplate = {
  type: "beveled"
  width: number
  height: number
  bevelSize: number
  bevelCorner: Corner
}

export type ShapeTemplate = RectangleTemplate | LShapedTemplate | BeveledTemplate

export type RoomEntity = {
  type: "room"
  id: string
  name: string
  position: Point
  shapeTemplate: ShapeTemplate
  color?: string
}

export type FurnitureType =
  | "square-table"
  | "circle-table"
  | "rectangle-desk"
  | "l-shaped-desk"
  | "couch"
  | "l-shaped-couch"
  | "fridge"
  | "bed"

export type RectangleFurnitureTemplate = {
  type: "rectangle"
  width: number
  height: number
}

export type CircleFurnitureTemplate = {
  type: "circle"
  radius: number
}

export type LShapedFurnitureTemplate = {
  type: "l-shaped"
  width: number
  height: number
  cutWidth: number
  cutHeight: number
  cutCorner: Corner
}

export type FurnitureShapeTemplate =
  | RectangleFurnitureTemplate
  | CircleFurnitureTemplate
  | LShapedFurnitureTemplate

export type FurnitureRotation = 0 | 90 | 180 | 270

export function isFurnitureRotation(value: unknown): value is FurnitureRotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

export type FurnitureEntity = {
  type: "furniture"
  id: string
  name: string
  furnitureType: FurnitureType
  roomId: string
  position: Point
  shapeTemplate: FurnitureShapeTemplate
  color?: string
  rotation: FurnitureRotation
}

export type HingeSide = "left" | "right"

export type DoorEntity = {
  type: "door"
  id: string
  name: string
  roomId: string
  wallIndex: number
  positionOnWall: number
  width: number
  hingeSide: HingeSide
}

export type Entity = RoomEntity | FurnitureEntity | DoorEntity

export type LayoutDocument = {
  version: 1 | 2
  entities: Entity[]
}

export const DEFAULT_LAYOUT_DOCUMENT: LayoutDocument = {
  version: 2,
  entities: [],
}

export type WallSegment = {
  start: Point
  end: Point
  length: number
}

