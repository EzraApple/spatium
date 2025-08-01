import type { Point, Room, FurnitureItem } from "../types";
import { getFurnitureVertices, getFurnitureBoundingBox } from "./furniture";

/**
 * Point-in-polygon test using ray casting algorithm
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const x = point.x;
  const y = point.y;
  
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
    j = i;
  }
  
  return inside;
}

/**
 * Check if two line segments intersect
 */
export function doLinesIntersect(
  p1: Point, q1: Point,
  p2: Point, q2: Point
): boolean {
  function orientation(p: Point, q: Point, r: Point): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }
  
  function onSegment(p: Point, q: Point, r: Point): boolean {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
           q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  }
  
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  
  // General case
  if (o1 !== o2 && o3 !== o4) return true;
  
  // Special cases
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  
  return false;
}

/**
 * Check if two polygons intersect using separating axis theorem
 */
export function doPolygonsIntersect(poly1: Point[], poly2: Point[]): boolean {
  if (poly1.length < 3 || poly2.length < 3) return false;
  
  // Check if any vertex of poly1 is inside poly2
  for (const vertex of poly1) {
    if (isPointInPolygon(vertex, poly2)) return true;
  }
  
  // Check if any vertex of poly2 is inside poly1
  for (const vertex of poly2) {
    if (isPointInPolygon(vertex, poly1)) return true;
  }
  
  // Check if any edges intersect
  for (let i = 0; i < poly1.length; i++) {
    const p1 = poly1[i]!;
    const q1 = poly1[(i + 1) % poly1.length]!;
    
    for (let j = 0; j < poly2.length; j++) {
      const p2 = poly2[j]!;
      const q2 = poly2[(j + 1) % poly2.length]!;
      
      if (doLinesIntersect(p1, q1, p2, q2)) return true;
    }
  }
  
  return false;
}

/**
 * Check if a rectangle (axis-aligned) intersects with a polygon
 */
export function doesRectangleIntersectPolygon(
  rectMinX: number, rectMinY: number,
  rectMaxX: number, rectMaxY: number,
  polygon: Point[]
): boolean {
  const rectangle: Point[] = [
    { x: rectMinX, y: rectMinY },
    { x: rectMaxX, y: rectMinY },
    { x: rectMaxX, y: rectMaxY },
    { x: rectMinX, y: rectMaxY }
  ];
  
  return doPolygonsIntersect(rectangle, polygon);
}

/**
 * Check if furniture piece is completely within room boundaries
 */
export function isFurnitureWithinRoom(furniture: FurnitureItem, room: Room): boolean {
  const furnitureVertices = getFurnitureVertices(furniture);
  
  // All furniture vertices must be inside the room
  for (const vertex of furnitureVertices) {
    if (!isPointInPolygon(vertex, room.vertices)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if furniture collides with room walls/boundaries
 */
export function checkRoomBoundaryCollision(furniture: FurnitureItem, room: Room): boolean {
  // If furniture is not completely within room, it's colliding with boundaries
  return !isFurnitureWithinRoom(furniture, room);
}

/**
 * Check if two furniture pieces collide
 */
export function checkFurnitureCollision(furniture1: FurnitureItem, furniture2: FurnitureItem): boolean {
  const vertices1 = getFurnitureVertices(furniture1);
  const vertices2 = getFurnitureVertices(furniture2);
  
  return doPolygonsIntersect(vertices1, vertices2);
}

/**
 * Check if furniture collides with any existing furniture in the room
 */
export function checkFurnitureListCollision(
  furniture: FurnitureItem,
  otherFurniture: FurnitureItem[]
): boolean {
  return otherFurniture.some(other => 
    other.id !== furniture.id && checkFurnitureCollision(furniture, other)
  );
}

/**
 * Check if furniture placement is valid (no collisions)
 */
export function isValidFurniturePlacement(
  furniture: FurnitureItem,
  room: Room,
  otherFurniture: FurnitureItem[] = []
): { isValid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Check room boundary collision
  if (checkRoomBoundaryCollision(furniture, room)) {
    reasons.push("Furniture extends outside room boundaries");
  }
  
  // Check collision with other furniture
  if (checkFurnitureListCollision(furniture, otherFurniture)) {
    reasons.push("Furniture collides with existing furniture");
  }
  
  return {
    isValid: reasons.length === 0,
    reasons
  };
}

/**
 * Find the nearest valid position for furniture placement
 * This is useful for snapping furniture to valid positions
 */
export function findNearestValidPosition(
  furniture: FurnitureItem,
  room: Room,
  otherFurniture: FurnitureItem[],
  searchRadius: number = 12 // inches
): Point | null {
  const originalPosition = furniture.position;
  const step = 0.5; // Half-inch precision
  
  // Try positions in expanding circles around the target position
  for (let radius = 0; radius <= searchRadius; radius += step) {
    const positions: Point[] = [];
    
    if (radius === 0) {
      positions.push(originalPosition);
    } else {
      // Generate positions in a circle around the original position
      const steps = Math.max(8, Math.ceil(2 * Math.PI * radius / step));
      for (let i = 0; i < steps; i++) {
        const angle = (2 * Math.PI * i) / steps;
        positions.push({
          x: originalPosition.x + radius * Math.cos(angle),
          y: originalPosition.y + radius * Math.sin(angle)
        });
      }
    }
    
    // Test each position
    for (const position of positions) {
      const testFurniture: FurnitureItem = {
        ...furniture,
        position: {
          x: Math.round(position.x * 2) / 2, // Snap to half-inch
          y: Math.round(position.y * 2) / 2
        }
      };
      
      const validation = isValidFurniturePlacement(testFurniture, room, otherFurniture);
      if (validation.isValid) {
        return testFurniture.position;
      }
    }
  }
  
  return null;
}

/**
 * Get minimum clearance distance from furniture to room walls
 */
export function getFurnitureWallClearance(furniture: FurnitureItem, room: Room): number {
  const furnitureVertices = getFurnitureVertices(furniture);
  let minDistance = Infinity;
  
  // Check distance from each furniture vertex to each room wall
  for (let i = 0; i < room.vertices.length; i++) {
    const wallStart = room.vertices[i]!;
    const wallEnd = room.vertices[(i + 1) % room.vertices.length]!;
    
    for (const vertex of furnitureVertices) {
      const distance = distancePointToLineSegment(vertex, wallStart, wallEnd);
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  return minDistance === Infinity ? 0 : minDistance;
}

/**
 * Calculate distance from a point to a line segment
 */
export function distancePointToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    // Line segment is just a point
    const pdx = point.x - lineStart.x;
    const pdy = point.y - lineStart.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }
  
  // Parameter t represents position along the line segment (0 = start, 1 = end)
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
  ));
  
  // Find the closest point on the line segment
  const closestX = lineStart.x + t * dx;
  const closestY = lineStart.y + t * dy;
  
  // Calculate distance
  const distX = point.x - closestX;
  const distY = point.y - closestY;
  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Check if furniture can be rotated at current position without collisions
 */
export function canRotateFurniture(
  furniture: FurnitureItem,
  newRotation: number,
  room: Room,
  otherFurniture: FurnitureItem[]
): boolean {
  const rotatedFurniture: FurnitureItem = {
    ...furniture,
    rotation: newRotation
  };
  
  const validation = isValidFurniturePlacement(rotatedFurniture, room, otherFurniture);
  return validation.isValid;
}

/**
 * Get all valid rotation angles for furniture at current position
 */
export function getValidRotations(
  furniture: FurnitureItem,
  room: Room,
  otherFurniture: FurnitureItem[]
): number[] {
  const validRotations: number[] = [];
  const rotations = [0, 90, 180, 270];
  
  for (const rotation of rotations) {
    if (canRotateFurniture(furniture, rotation, room, otherFurniture)) {
      validRotations.push(rotation);
    }
  }
  
  return validRotations;
}