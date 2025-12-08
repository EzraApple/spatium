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
  vertices: Point[]
  shapeTemplate: ShapeTemplate
}

export type FurnitureType = "square-table" | "circle-table" | "rectangle-desk" | "l-shaped-desk"

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

export type FurnitureEntity = {
  type: "furniture"
  id: string
  name: string
  furnitureType: FurnitureType
  roomId: string
  position: Point
  shapeTemplate: FurnitureShapeTemplate
}

export type Entity = RoomEntity | FurnitureEntity

export type LayoutDocument = {
  version: 1
  entities: Entity[]
}

export const DEFAULT_LAYOUT_DOCUMENT: LayoutDocument = {
  version: 1,
  entities: [],
}

export type WallSegment = {
  start: Point
  end: Point
  length: number
}

