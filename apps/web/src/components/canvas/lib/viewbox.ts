import type { Point, RoomEntity } from "@apartment-planner/shared"
import { getRoomVertices } from "@apartment-planner/shared"
import { SCALE, FIT_PADDING } from "./constants"

export type ViewBox = {
  x: number
  y: number
  width: number
  height: number
}

function getStorageKey(roomCode: string) {
  return `spatium-viewbox-${roomCode}`
}

export function loadViewBox(roomCode: string): ViewBox | null {
  try {
    const stored = sessionStorage.getItem(getStorageKey(roomCode))
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
  }
  return null
}

export function saveViewBox(roomCode: string, viewBox: ViewBox) {
  try {
    sessionStorage.setItem(getStorageKey(roomCode), JSON.stringify(viewBox))
  } catch {
  }
}

export function calculateFitToContentViewBox(
  rooms: RoomEntity[],
  svgWidth: number,
  svgHeight: number
): ViewBox | null {
  if (rooms.length === 0) return null

  const allVertices: Point[] = []
  for (const room of rooms) {
    const vertices = getRoomVertices(room)
    for (const vertex of vertices) {
      allVertices.push({
        x: (vertex.x + room.position.x) * SCALE,
        y: (vertex.y + room.position.y) * SCALE,
      })
    }
  }

  if (allVertices.length === 0) return null

  const minX = Math.min(...allVertices.map((v) => v.x))
  const maxX = Math.max(...allVertices.map((v) => v.x))
  const minY = Math.min(...allVertices.map((v) => v.y))
  const maxY = Math.max(...allVertices.map((v) => v.y))

  const contentWidth = maxX - minX
  const contentHeight = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const aspectRatio = svgWidth / svgHeight
  const paddedWidth = contentWidth / FIT_PADDING
  const paddedHeight = contentHeight / FIT_PADDING

  let viewWidth: number
  let viewHeight: number

  if (paddedWidth / paddedHeight > aspectRatio) {
    viewWidth = paddedWidth
    viewHeight = paddedWidth / aspectRatio
  } else {
    viewHeight = paddedHeight
    viewWidth = paddedHeight * aspectRatio
  }

  return {
    x: centerX - viewWidth / 2,
    y: centerY - viewHeight / 2,
    width: viewWidth,
    height: viewHeight,
  }
}

