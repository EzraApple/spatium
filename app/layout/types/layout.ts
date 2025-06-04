import type { CanvasVertex, CanvasSegment } from "../components/shape-editor-canvas"
import type { Door } from "../components/room-editor"
import type { FurnitureItem } from "../components/furniture-editor"

export interface LayoutRoom {
  id: string
  name: string
  vertices: CanvasVertex[]
  segments: CanvasSegment[]
  doors: Door[]
  furniture: FurnitureItem[]
}

export interface Layout {
  id: string
  name: string
  title: string
  code: string
  createdAt: Date
  updatedAt: Date
  rooms: LayoutRoom[]
}

const generateLayoutCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const createEmptyLayout = (name: string): Layout => ({
  id: `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  title: name,
  code: generateLayoutCode(),
  createdAt: new Date(),
  updatedAt: new Date(),
  rooms: []
})

export const createLayoutRoom = (name: string, vertices: CanvasVertex[], segments: CanvasSegment[], doors: Door[] = []): LayoutRoom => ({
  id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  vertices,
  segments,
  doors,
  furniture: []
}) 