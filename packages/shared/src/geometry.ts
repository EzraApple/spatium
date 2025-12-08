import type { Point, ShapeTemplate, FurnitureShapeTemplate, WallSegment } from "./entities"

export function shapeToVertices(template: ShapeTemplate): Point[] {
  switch (template.type) {
    case "rectangle":
      return rectangleToVertices(template.width, template.height)
    case "l-shaped":
      return lShapedToVertices(
        template.width,
        template.height,
        template.cutWidth,
        template.cutHeight,
        template.cutCorner
      )
    case "beveled":
      return beveledToVertices(
        template.width,
        template.height,
        template.bevelSize,
        template.bevelCorner
      )
  }
}

export function furnitureShapeToVertices(template: FurnitureShapeTemplate): Point[] {
  switch (template.type) {
    case "rectangle":
      return rectangleToVertices(template.width, template.height)
    case "circle":
      return circleToVertices(template.radius)
    case "l-shaped":
      return lShapedToVertices(
        template.width,
        template.height,
        template.cutWidth,
        template.cutHeight,
        template.cutCorner
      )
  }
}

function circleToVertices(radius: number, segments: number = 32): Point[] {
  const vertices: Point[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    vertices.push({
      x: radius + Math.cos(angle) * radius,
      y: radius + Math.sin(angle) * radius,
    })
  }
  return vertices
}

function rectangleToVertices(width: number, height: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
}

function lShapedToVertices(
  width: number,
  height: number,
  cutWidth: number,
  cutHeight: number,
  cutCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
): Point[] {
  switch (cutCorner) {
    case "top-right":
      return [
        { x: 0, y: 0 },
        { x: width - cutWidth, y: 0 },
        { x: width - cutWidth, y: cutHeight },
        { x: width, y: cutHeight },
        { x: width, y: height },
        { x: 0, y: height },
      ]
    case "top-left":
      return [
        { x: cutWidth, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
        { x: 0, y: cutHeight },
        { x: cutWidth, y: cutHeight },
      ]
    case "bottom-right":
      return [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height - cutHeight },
        { x: width - cutWidth, y: height - cutHeight },
        { x: width - cutWidth, y: height },
        { x: 0, y: height },
      ]
    case "bottom-left":
      return [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: cutWidth, y: height },
        { x: cutWidth, y: height - cutHeight },
        { x: 0, y: height - cutHeight },
      ]
  }
}

function beveledToVertices(
  width: number,
  height: number,
  bevelSize: number,
  bevelCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
): Point[] {
  switch (bevelCorner) {
    case "top-left":
      return [
        { x: bevelSize, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
        { x: 0, y: bevelSize },
      ]
    case "top-right":
      return [
        { x: 0, y: 0 },
        { x: width - bevelSize, y: 0 },
        { x: width, y: bevelSize },
        { x: width, y: height },
        { x: 0, y: height },
      ]
    case "bottom-right":
      return [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height - bevelSize },
        { x: width - bevelSize, y: height },
        { x: 0, y: height },
      ]
    case "bottom-left":
      return [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: bevelSize, y: height },
        { x: 0, y: height - bevelSize },
      ]
  }
}

export function getWallSegments(vertices: Point[], position: Point): WallSegment[] {
  const segments: WallSegment[] = []
  for (let i = 0; i < vertices.length; i++) {
    const start = {
      x: vertices[i].x + position.x,
      y: vertices[i].y + position.y,
    }
    const end = {
      x: vertices[(i + 1) % vertices.length].x + position.x,
      y: vertices[(i + 1) % vertices.length].y + position.y,
    }
    const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
    segments.push({ start, end, length })
  }
  return segments
}

export function getAbsoluteVertices(vertices: Point[], position: Point): Point[] {
  return vertices.map((v) => ({
    x: v.x + position.x,
    y: v.y + position.y,
  }))
}

function ccw(a: Point, b: Point, c: Point): boolean {
  return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x)
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2)
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function polygonsIntersect(polyA: Point[], polyB: Point[]): boolean {
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i]
    const a2 = polyA[(i + 1) % polyA.length]
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j]
      const b2 = polyB[(j + 1) % polyB.length]
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true
      }
    }
  }

  if (pointInPolygon(polyA[0], polyB) || pointInPolygon(polyB[0], polyA)) {
    return true
  }

  return false
}

export function pointInCircle(point: Point, center: Point, radius: number): boolean {
  const dx = point.x - center.x
  const dy = point.y - center.y
  return dx * dx + dy * dy <= radius * radius
}

export function circlesIntersect(
  center1: Point,
  radius1: number,
  center2: Point,
  radius2: number
): boolean {
  const dx = center2.x - center1.x
  const dy = center2.y - center1.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < radius1 + radius2
}

export function circlePolygonIntersect(center: Point, radius: number, polygon: Point[]): boolean {
  if (pointInPolygon(center, polygon)) {
    return true
  }

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % polygon.length]
    if (pointToSegmentDistance(center, p1, p2) < radius) {
      return true
    }
  }

  return false
}

function pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): number {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    const pdx = point.x - segStart.x
    const pdy = point.y - segStart.y
    return Math.sqrt(pdx * pdx + pdy * pdy)
  }

  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))

  const projX = segStart.x + t * dx
  const projY = segStart.y + t * dy
  const distX = point.x - projX
  const distY = point.y - projY

  return Math.sqrt(distX * distX + distY * distY)
}

export function isPointInRoom(point: Point, roomVertices: Point[], roomPosition: Point): boolean {
  const absoluteVertices = getAbsoluteVertices(roomVertices, roomPosition)
  return pointInPolygon(point, absoluteVertices)
}

export { pointInPolygon }

export function findSnapPosition(
  movingRoom: { vertices: Point[]; position: Point },
  otherRooms: { vertices: Point[]; position: Point }[],
  snapThreshold: number
): Point | null {
  const movingWalls = getWallSegments(movingRoom.vertices, movingRoom.position)

  for (const other of otherRooms) {
    const otherWalls = getWallSegments(other.vertices, other.position)

    for (const movingWall of movingWalls) {
      for (const otherWall of otherWalls) {
        const movingIsVertical = Math.abs(movingWall.start.x - movingWall.end.x) < 1
        const otherIsVertical = Math.abs(otherWall.start.x - otherWall.end.x) < 1

        if (movingIsVertical && otherIsVertical) {
          const xDiff = otherWall.start.x - movingWall.start.x
          if (Math.abs(xDiff) <= snapThreshold) {
            return {
              x: movingRoom.position.x + xDiff,
              y: movingRoom.position.y,
            }
          }
        }

        const movingIsHorizontal = Math.abs(movingWall.start.y - movingWall.end.y) < 1
        const otherIsHorizontal = Math.abs(otherWall.start.y - otherWall.end.y) < 1

        if (movingIsHorizontal && otherIsHorizontal) {
          const yDiff = otherWall.start.y - movingWall.start.y
          if (Math.abs(yDiff) <= snapThreshold) {
            return {
              x: movingRoom.position.x,
              y: movingRoom.position.y + yDiff,
            }
          }
        }
      }
    }
  }

  return null
}

