import type { Point, ShapeTemplate, FurnitureShapeTemplate, WallSegment, DoorEntity, HingeSide, RoomEntity } from "./entities"

export function getRoomVertices(room: RoomEntity): Point[] {
  return shapeToVertices(room.shapeTemplate)
}

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

export function getFurnitureVertices(furniture: FurnitureEntity): Point[] {
  const vertices = furnitureShapeToVertices(furniture.shapeTemplate)
  if (furniture.rotation === 0) return vertices

  const minX = Math.min(...vertices.map((v) => v.x))
  const maxX = Math.max(...vertices.map((v) => v.x))
  const minY = Math.min(...vertices.map((v) => v.y))
  const maxY = Math.max(...vertices.map((v) => v.y))
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

  const rad = (furniture.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return vertices.map((p) => {
    const dx = p.x - center.x
    const dy = p.y - center.y
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    }
  })
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

  let bestXSnap: { diff: number; position: Point } | null = null
  let bestYSnap: { diff: number; position: Point } | null = null

  for (const other of otherRooms) {
    const otherWalls = getWallSegments(other.vertices, other.position)

    for (const movingWall of movingWalls) {
      for (const otherWall of otherWalls) {
        const movingIsVertical = Math.abs(movingWall.start.x - movingWall.end.x) < 1
        const otherIsVertical = Math.abs(otherWall.start.x - otherWall.end.x) < 1

        if (movingIsVertical && otherIsVertical) {
          const xDiff = otherWall.start.x - movingWall.start.x
          const absDiff = Math.abs(xDiff)
          if (absDiff <= snapThreshold && (!bestXSnap || absDiff < bestXSnap.diff)) {
            bestXSnap = {
              diff: absDiff,
              position: {
                x: movingRoom.position.x + xDiff,
                y: movingRoom.position.y,
              },
            }
          }
        }

        const movingIsHorizontal = Math.abs(movingWall.start.y - movingWall.end.y) < 1
        const otherIsHorizontal = Math.abs(otherWall.start.y - otherWall.end.y) < 1

        if (movingIsHorizontal && otherIsHorizontal) {
          const yDiff = otherWall.start.y - movingWall.start.y
          const absDiff = Math.abs(yDiff)
          if (absDiff <= snapThreshold && (!bestYSnap || absDiff < bestYSnap.diff)) {
            bestYSnap = {
              diff: absDiff,
              position: {
                x: movingRoom.position.x,
                y: movingRoom.position.y + yDiff,
              },
            }
          }
        }
      }
    }
  }

  if (bestXSnap && bestYSnap) {
    return {
      x: bestXSnap.position.x,
      y: bestYSnap.position.y,
    }
  }

  if (bestXSnap) return bestXSnap.position
  if (bestYSnap) return bestYSnap.position

  return null
}

export function closestPointOnSegment(point: Point, segStart: Point, segEnd: Point): Point {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return { x: segStart.x, y: segStart.y }
  }

  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))

  return {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy,
  }
}

function segmentToSegmentDistance(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): { distance: number; pointOnA: Point; pointOnB: Point } {
  const candidates: { distance: number; pointOnA: Point; pointOnB: Point }[] = []

  const a1OnB = closestPointOnSegment(a1, b1, b2)
  candidates.push({
    distance: Math.sqrt((a1.x - a1OnB.x) ** 2 + (a1.y - a1OnB.y) ** 2),
    pointOnA: a1,
    pointOnB: a1OnB,
  })

  const a2OnB = closestPointOnSegment(a2, b1, b2)
  candidates.push({
    distance: Math.sqrt((a2.x - a2OnB.x) ** 2 + (a2.y - a2OnB.y) ** 2),
    pointOnA: a2,
    pointOnB: a2OnB,
  })

  const b1OnA = closestPointOnSegment(b1, a1, a2)
  candidates.push({
    distance: Math.sqrt((b1.x - b1OnA.x) ** 2 + (b1.y - b1OnA.y) ** 2),
    pointOnA: b1OnA,
    pointOnB: b1,
  })

  const b2OnA = closestPointOnSegment(b2, a1, a2)
  candidates.push({
    distance: Math.sqrt((b2.x - b2OnA.x) ** 2 + (b2.y - b2OnA.y) ** 2),
    pointOnA: b2OnA,
    pointOnB: b2,
  })

  return candidates.reduce((min, curr) => (curr.distance < min.distance ? curr : min))
}

export type DistanceMeasurement = {
  distance: number
  furniturePoint: Point
  obstaclePoint: Point
  obstacleType: "wall" | "furniture"
  obstacleName: string
}

export function findNearestDistances(
  furnitureVertices: Point[],
  roomWallVertices: Point[],
  otherFurniture: { vertices: Point[]; name: string }[],
  count: number = 2
): DistanceMeasurement[] {
  const measurements: DistanceMeasurement[] = []

  for (let i = 0; i < furnitureVertices.length; i++) {
    const fStart = furnitureVertices[i]
    const fEnd = furnitureVertices[(i + 1) % furnitureVertices.length]

    for (let j = 0; j < roomWallVertices.length; j++) {
      const wStart = roomWallVertices[j]
      const wEnd = roomWallVertices[(j + 1) % roomWallVertices.length]

      const result = segmentToSegmentDistance(fStart, fEnd, wStart, wEnd)
      measurements.push({
        distance: result.distance,
        furniturePoint: result.pointOnA,
        obstaclePoint: result.pointOnB,
        obstacleType: "wall",
        obstacleName: "Wall",
      })
    }
  }

  for (const other of otherFurniture) {
    for (let i = 0; i < furnitureVertices.length; i++) {
      const fStart = furnitureVertices[i]
      const fEnd = furnitureVertices[(i + 1) % furnitureVertices.length]

      for (let j = 0; j < other.vertices.length; j++) {
        const oStart = other.vertices[j]
        const oEnd = other.vertices[(j + 1) % other.vertices.length]

        const result = segmentToSegmentDistance(fStart, fEnd, oStart, oEnd)
        measurements.push({
          distance: result.distance,
          furniturePoint: result.pointOnA,
          obstaclePoint: result.pointOnB,
          obstacleType: "furniture",
          obstacleName: other.name,
        })
      }
    }
  }

  measurements.sort((a, b) => a.distance - b.distance)

  const selected: DistanceMeasurement[] = []
  for (const m of measurements) {
    if (m.distance < 1) continue

    const isDuplicate = selected.some((s) => {
      const sameDirection =
        Math.abs(s.furniturePoint.x - s.obstaclePoint.x - (m.furniturePoint.x - m.obstaclePoint.x)) < 1 &&
        Math.abs(s.furniturePoint.y - s.obstaclePoint.y - (m.furniturePoint.y - m.obstaclePoint.y)) < 1
      return sameDirection
    })

    if (!isDuplicate) {
      selected.push(m)
      if (selected.length >= count) break
    }
  }

  return selected
}

export type WallSnapResult = {
  wallIndex: number
  positionOnWall: number
  point: Point
  wallAngle: number
  wallStart: Point
  wallEnd: Point
}

export function findClosestWallPoint(
  worldPoint: Point,
  walls: WallSegment[],
  doorWidth: number
): WallSnapResult | null {
  if (walls.length === 0) return null

  let closestResult: WallSnapResult | null = null
  let closestDistance = Infinity

  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i]
    const closest = closestPointOnSegment(worldPoint, wall.start, wall.end)
    const dx = worldPoint.x - closest.x
    const dy = worldPoint.y - closest.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < closestDistance) {
      closestDistance = distance

      const wallDx = wall.end.x - wall.start.x
      const wallDy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

      let positionOnWall = 0
      if (wallLength > 0) {
        const projDx = closest.x - wall.start.x
        const projDy = closest.y - wall.start.y
        positionOnWall = Math.sqrt(projDx * projDx + projDy * projDy)
      }

      const halfDoor = doorWidth / 2
      positionOnWall = Math.max(halfDoor, Math.min(wall.length - halfDoor, positionOnWall))

      const t = positionOnWall / wall.length
      const snappedPoint = {
        x: wall.start.x + t * wallDx,
        y: wall.start.y + t * wallDy,
      }

      closestResult = {
        wallIndex: i,
        positionOnWall,
        point: snappedPoint,
        wallAngle: Math.atan2(wallDy, wallDx),
        wallStart: wall.start,
        wallEnd: wall.end,
      }
    }
  }

  return closestResult
}

export type DoorGeometry = {
  doorStart: Point
  doorEnd: Point
  hingePoint: Point
  swingStartPoint: Point
  swingEndPoint: Point
  swingRadius: number
  sweepFlag: number
  doorAngle: number
}

export function getDoorGeometry(
  wallStart: Point,
  wallEnd: Point,
  positionOnWall: number,
  doorWidth: number,
  hingeSide: HingeSide,
  roomVertices: Point[],
  roomPosition: Point
): DoorGeometry {
  const wallDx = wallEnd.x - wallStart.x
  const wallDy = wallEnd.y - wallStart.y
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

  const wallUnitX = wallDx / wallLength
  const wallUnitY = wallDy / wallLength

  const doorCenterX = wallStart.x + wallUnitX * positionOnWall
  const doorCenterY = wallStart.y + wallUnitY * positionOnWall

  const halfDoor = doorWidth / 2
  const doorStart = {
    x: doorCenterX - wallUnitX * halfDoor,
    y: doorCenterY - wallUnitY * halfDoor,
  }
  const doorEnd = {
    x: doorCenterX + wallUnitX * halfDoor,
    y: doorCenterY + wallUnitY * halfDoor,
  }

  const hingePoint = hingeSide === "left" ? doorStart : doorEnd
  const swingStartPoint = hingeSide === "left" ? doorEnd : doorStart

  const normalX = -wallUnitY
  const normalY = wallUnitX

  const testPointPositive = {
    x: doorCenterX + normalX * 10,
    y: doorCenterY + normalY * 10,
  }

  const absoluteVertices = getAbsoluteVertices(roomVertices, roomPosition)
  const positiveIsInside = pointInPolygon(testPointPositive, absoluteVertices)

  const inwardX = positiveIsInside ? normalX : -normalX
  const inwardY = positiveIsInside ? normalY : -normalY

  const swingEndX = hingePoint.x + inwardX * doorWidth
  const swingEndY = hingePoint.y + inwardY * doorWidth

  const cross = (swingStartPoint.x - hingePoint.x) * (swingEndY - hingePoint.y) -
                (swingStartPoint.y - hingePoint.y) * (swingEndX - hingePoint.x)
  const sweepFlag = cross > 0 ? 1 : 0

  const swingEndPoint = { x: swingEndX, y: swingEndY }

  const doorAngle = Math.atan2(wallDy, wallDx) * (180 / Math.PI)

  return {
    doorStart,
    doorEnd,
    hingePoint,
    swingStartPoint,
    swingEndPoint,
    swingRadius: doorWidth,
    sweepFlag,
    doorAngle,
  }
}

export function getDoorAbsolutePosition(
  door: DoorEntity,
  roomVertices: Point[],
  roomPosition: Point
): { walls: WallSegment[]; geometry: DoorGeometry } | null {
  const walls = getWallSegments(roomVertices, roomPosition)
  if (door.wallIndex >= walls.length) return null

  const wall = walls[door.wallIndex]
  const geometry = getDoorGeometry(
    wall.start,
    wall.end,
    door.positionOnWall,
    door.width,
    door.hingeSide,
    roomVertices,
    roomPosition
  )

  return { walls, geometry }
}


