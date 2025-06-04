// components/room-display-canvas.tsx
"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import type { CanvasVertex } from "./shape-editor-canvas"
import type { LayoutRoom } from "../types/layout"
import type { FurnitureItem } from "./furniture-editor"

interface RoomDisplayCanvasProps {
  room: LayoutRoom | null
  furnitureBeingPlaced?: FurnitureItem | null
  onConfirmFurniturePlacement?: (furniture: FurnitureItem) => void
  onCancelFurniturePlacement?: () => void
  onUpdateFurniture?: (furniture: FurnitureItem[]) => void
  onEnterPlacementMode?: (furniture: FurnitureItem) => void
  onUpdateFurnitureBeingPlaced?: (furniture: FurnitureItem) => void
  onSelectFurniture?: (furnitureId: string) => void
  onDeselectFurniture?: (furnitureId: string) => void
  onUpdateFurniturePosition?: (furnitureId: string, x: number, y: number, rotation?: 0 | 90 | 180 | 270) => void
  className?: string
  roomFillColor?: string
  roomStrokeColor?: string
  roomStrokeWidth?: number
  padding?: number // Padding around the room when fitting, in SVG units
}

const DEFAULT_ROOM_FILL_COLOR = "#e5e7eb" // Tailwind gray-200
const DEFAULT_ROOM_STROKE_COLOR = "#6b7280" // Tailwind gray-500
const DEFAULT_ROOM_STROKE_WIDTH = 2 // In SVG units (will scale with zoom)
const DEFAULT_PADDING = 50 // SVG units
const PIXELS_PER_INCH = 4 // Match the editor's scale

const RoomDisplayCanvas: React.FC<RoomDisplayCanvasProps> = ({
  room,
  furnitureBeingPlaced,
  onConfirmFurniturePlacement,
  onCancelFurniturePlacement,
  onUpdateFurniture,
  onEnterPlacementMode,
  onUpdateFurnitureBeingPlaced,
  onSelectFurniture,
  onDeselectFurniture,
  onUpdateFurniturePosition,
  className,
  roomFillColor = DEFAULT_ROOM_FILL_COLOR,
  roomStrokeColor = DEFAULT_ROOM_STROKE_COLOR,
  roomStrokeWidth = DEFAULT_ROOM_STROKE_WIDTH,
  padding = DEFAULT_PADDING,
}) => {
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  })
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [isPanning, setIsPanning] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null)
  const [localFurniturePosition, setLocalFurniturePosition] = useState<{
    id: string
    x: number
    y: number
    rotation?: 0 | 90 | 180 | 270
  } | null>(null)
  const [furnitureInPlacementMode, setFurnitureInPlacementMode] = useState<string | null>(null)
  const [interpolatedPositions, setInterpolatedPositions] = useState<Map<string, {
    targetX: number
    targetY: number
    currentX: number
    currentY: number
    startTime: number
  }>>(new Map())
  const [recentlyPlacedFurniture, setRecentlyPlacedFurniture] = useState<Set<string>>(new Set())
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null)
  const databaseUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDatabaseUpdateRef = useRef<number>(0)

  // Helper function to get effective furniture position (local override if dragging)
  const getEffectiveFurniture = (furniture: FurnitureItem): FurnitureItem => {
    // Priority 1: Local position if we're moving this furniture
    if (localFurniturePosition && localFurniturePosition.id === furniture.id) {
      return {
        ...furniture,
        x: localFurniturePosition.x,
        y: localFurniturePosition.y,
        ...(localFurniturePosition.rotation !== undefined && { rotation: localFurniturePosition.rotation })
      }
    }
    
    // Priority 2: Interpolated position if someone else is moving this furniture
    const interpolated = interpolatedPositions.get(furniture.id)
    if (interpolated && furniture.isSelected && selectedFurnitureId !== furniture.id) {
      return {
        ...furniture,
        x: interpolated.currentX,
        y: interpolated.currentY
      }
    }
    
    return furniture
  }

  // Animation loop for smooth interpolation
  useEffect(() => {
    let animationFrame: number
    
    const animate = () => {
      const now = Date.now()
      const newInterpolatedPositions = new Map(interpolatedPositions)
      let hasChanges = false
      
      for (const [furnitureId, interpolation] of newInterpolatedPositions) {
        const elapsed = now - interpolation.startTime
        const duration = 100 // Interpolate over 100ms
        
        if (elapsed < duration) {
          // Smooth interpolation using easeOut
          const progress = elapsed / duration
          const easeOut = 1 - Math.pow(1 - progress, 3)
          
          const newX = interpolation.currentX + (interpolation.targetX - interpolation.currentX) * easeOut
          const newY = interpolation.currentY + (interpolation.targetY - interpolation.currentY) * easeOut
          
          newInterpolatedPositions.set(furnitureId, {
            ...interpolation,
            currentX: newX,
            currentY: newY
          })
          hasChanges = true
        } else {
          // Animation complete
          newInterpolatedPositions.set(furnitureId, {
            ...interpolation,
            currentX: interpolation.targetX,
            currentY: interpolation.targetY
          })
        }
      }
      
      if (hasChanges) {
        setInterpolatedPositions(newInterpolatedPositions)
      }
      
      animationFrame = requestAnimationFrame(animate)
    }
    
    if (interpolatedPositions.size > 0) {
      animationFrame = requestAnimationFrame(animate)
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [interpolatedPositions])

  // Update interpolation targets when furniture positions change from database
  useEffect(() => {
    if (!room) return
    
    room.furniture.forEach(furniture => {
      // Skip interpolation for recently placed furniture to prevent echo
      if (recentlyPlacedFurniture.has(furniture.id)) {
        return
      }
      
      // Only interpolate furniture that's selected by someone else
      if (furniture.isSelected && selectedFurnitureId !== furniture.id) {
        const currentInterpolation = interpolatedPositions.get(furniture.id)
        
        // Start interpolation if position changed
        if (!currentInterpolation || 
            Math.abs(currentInterpolation.targetX - furniture.x) > 1 || 
            Math.abs(currentInterpolation.targetY - furniture.y) > 1) {
          
          setInterpolatedPositions(prev => new Map(prev.set(furniture.id, {
            targetX: furniture.x,
            targetY: furniture.y,
            currentX: currentInterpolation?.currentX ?? furniture.x,
            currentY: currentInterpolation?.currentY ?? furniture.y,
            startTime: Date.now()
          })))
        }
      } else {
        // Remove interpolation for furniture that's no longer being moved by others
        setInterpolatedPositions(prev => {
          const newMap = new Map(prev)
          newMap.delete(furniture.id)
          return newMap
        })
      }
    })
  }, [room?.furniture, selectedFurnitureId, recentlyPlacedFurniture])

  // Clean up recently placed furniture after a delay
  useEffect(() => {
    if (recentlyPlacedFurniture.size === 0) return
    
    const timeout = setTimeout(() => {
      setRecentlyPlacedFurniture(new Set())
    }, 500) // Clear after 500ms to prevent echo
    
    return () => clearTimeout(timeout)
  }, [recentlyPlacedFurniture])

  // Helper functions for door rendering
  const getVertexById = (id: string) => room?.vertices.find((v) => v.id === id)
  const getSegmentById = (id: string) => room?.segments.find((s) => s.id === id)

  const getDoorPosition = (door: any) => {
    const segment = getSegmentById(door.segmentId)
    if (!segment) return null
    
    const v1 = getVertexById(segment.v1_id)
    const v2 = getVertexById(segment.v2_id)
    if (!v1 || !v2) return null

    const doorX = v1.x + (v2.x - v1.x) * door.position
    const doorY = v1.y + (v2.y - v1.y) * door.position
    
    // Calculate door line endpoints
    const doorLengthPixels = door.size * PIXELS_PER_INCH
    const segmentAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x)
    
    const halfDoorLength = doorLengthPixels / 2
    const doorStartX = doorX - Math.cos(segmentAngle) * halfDoorLength
    const doorStartY = doorY - Math.sin(segmentAngle) * halfDoorLength
    const doorEndX = doorX + Math.cos(segmentAngle) * halfDoorLength
    const doorEndY = doorY + Math.sin(segmentAngle) * halfDoorLength

    // Determine hinge point based on hinge side
    const hingeX = door.hingeSide === "left" ? doorStartX : doorEndX
    const hingeY = door.hingeSide === "left" ? doorStartY : doorEndY
    const openEndX = door.hingeSide === "left" ? doorEndX : doorStartX
    const openEndY = door.hingeSide === "left" ? doorEndY : doorStartY
    
    // Calculate the 90-degree swing position
    const perpAngle = segmentAngle + Math.PI / 2
    
    // Determine swing direction based ONLY on door direction
    let swingAngle = perpAngle
    if (door.direction === "in") {
      swingAngle += Math.PI // Flip to opposite side for inward opening
    }
    
    // Calculate the end point of the 90-degree swing
    const swingEndX = hingeX + Math.cos(swingAngle) * doorLengthPixels
    const swingEndY = hingeY + Math.sin(swingAngle) * doorLengthPixels

    // Calculate the cross product to determine sweep direction
    const doorVecX = openEndX - hingeX
    const doorVecY = openEndY - hingeY
    const swingVecX = swingEndX - hingeX
    const swingVecY = swingEndY - hingeY
    
    const crossProduct = doorVecX * swingVecY - doorVecY * swingVecX
    const sweepFlag = crossProduct > 0 ? 1 : 0

    return {
      doorStart: { x: doorStartX, y: doorStartY },
      doorEnd: { x: doorEndX, y: doorEndY },
      hingePoint: { x: hingeX, y: hingeY },
      openEnd: { x: openEndX, y: openEndY },
      swingEnd: { x: swingEndX, y: swingEndY },
      doorCenter: { x: doorX, y: doorY },
      doorLength: doorLengthPixels,
      segmentAngle,
      sweepFlag
    }
  }

  // Furniture helper functions
  const getFurnitureColor = (type: string, isValid: boolean = true, isSelected: boolean = false) => {
    const alpha = isValid ? "1" : "0.5"
    const colors = {
      table: `rgba(210, 180, 140, ${alpha})`, // Light brown
      "l-shaped-desk": `rgba(210, 180, 140, ${alpha})`, // Light brown
      "circular-table": `rgba(210, 180, 140, ${alpha})`, // Light brown
      bed: `rgba(32, 178, 170, ${alpha})`, // Turquoise
      couch: `rgba(139, 69, 19, ${alpha})`, // Dark brown
      "l-shaped-couch": `rgba(139, 69, 19, ${alpha})`, // Dark brown
    }
    
    if (isSelected) {
      return colors[type as keyof typeof colors]?.replace(/[\d.]+\)$/, "0.8)") || colors.table
    }
    
    return colors[type as keyof typeof colors] || colors.table
  }

  const getFurnitureBounds = (furniture: FurnitureItem) => {
    if (furniture.type === "circular-table") {
      const radius = (furniture.diameter || 0) * PIXELS_PER_INCH / 2
      return {
        x: furniture.x - radius,
        y: furniture.y - radius,
        width: radius * 2,
        height: radius * 2,
      }
    }
    
    if (furniture.type === "l-shaped-desk" || furniture.type === "l-shaped-couch") {
      // L-shaped furniture needs special handling for bounds
      // We'll return the overall bounding box that contains both legs
      const length = furniture.length * PIXELS_PER_INCH
      const width = furniture.width * PIXELS_PER_INCH
      const depth = (furniture.depth || 0) * PIXELS_PER_INCH
      
      // Calculate bounds based on rotation
      let boundsWidth, boundsHeight
      if (furniture.rotation === 90 || furniture.rotation === 270) {
        boundsWidth = Math.max(width, depth)
        boundsHeight = Math.max(length, depth)
      } else {
        boundsWidth = Math.max(length, depth)
        boundsHeight = Math.max(width, depth)
      }
      
      return {
        x: furniture.x - boundsWidth / 2,
        y: furniture.y - boundsHeight / 2,
        width: boundsWidth,
        height: boundsHeight,
      }
    }
    
    const length = furniture.length * PIXELS_PER_INCH
    const width = furniture.width * PIXELS_PER_INCH
    
    // Handle rotation
    if (furniture.rotation === 90 || furniture.rotation === 270) {
      return {
        x: furniture.x - width / 2,
        y: furniture.y - length / 2,
        width: width,
        height: length,
      }
    }
    
    return {
      x: furniture.x - length / 2,
      y: furniture.y - width / 2,
      width: length,
      height: width,
    }
  }

  // Get the actual rectangles that make up L-shaped furniture for precise collision detection
  const getLShapeRectangles = (furniture: FurnitureItem) => {
    if (furniture.type !== "l-shaped-desk" && furniture.type !== "l-shaped-couch") {
      return []
    }

    const length = furniture.length * PIXELS_PER_INCH
    const width = furniture.width * PIXELS_PER_INCH
    const depth = (furniture.depth || 0) * PIXELS_PER_INCH

    let rect1, rect2

    switch (furniture.rotation) {
      case 0: // Default orientation - L opening to bottom-right
        // Horizontal leg (bottom part of L)
        rect1 = {
          x: furniture.x - length / 2,
          y: furniture.y + width / 2 - depth,
          width: length,
          height: depth
        }
        // Vertical leg (right part of L)
        rect2 = {
          x: furniture.x + length / 2 - depth,
          y: furniture.y - width / 2,
          width: depth,
          height: width
        }
        break
      case 90: // Rotated 90° clockwise - L opening to bottom-left
        // Horizontal leg (bottom part of L)
        rect1 = {
          x: furniture.x - width / 2,
          y: furniture.y + length / 2 - depth,
          width: width,
          height: depth
        }
        // Vertical leg (left part of L)
        rect2 = {
          x: furniture.x - width / 2,
          y: furniture.y - length / 2,
          width: depth,
          height: length
        }
        break
      case 180: // Rotated 180° - L opening to top-left
        // Horizontal leg (top part of L)
        rect1 = {
          x: furniture.x - length / 2,
          y: furniture.y - width / 2,
          width: length,
          height: depth
        }
        // Vertical leg (left part of L)
        rect2 = {
          x: furniture.x - length / 2,
          y: furniture.y - width / 2,
          width: depth,
          height: width
        }
        break
      case 270: // Rotated 270° clockwise - L opening to top-right
        // Horizontal leg (top part of L)
        rect1 = {
          x: furniture.x - width / 2,
          y: furniture.y - length / 2,
          width: width,
          height: depth
        }
        // Vertical leg (right part of L)
        rect2 = {
          x: furniture.x + width / 2 - depth,
          y: furniture.y - length / 2,
          width: depth,
          height: length
        }
        break
      default:
        return []
    }

    return [rect1, rect2]
  }

  const checkCollision = (furniture: FurnitureItem, excludeId?: string): boolean => {
    if (!room) return true
    
    const bounds = getFurnitureBounds(furniture)
    
    // Check collision with other furniture
    for (const existingFurniture of room.furniture) {
      if (existingFurniture.id === excludeId) continue
      
      const existingBounds = getFurnitureBounds(existingFurniture)
      
      if (bounds.x < existingBounds.x + existingBounds.width &&
          bounds.x + bounds.width > existingBounds.x &&
          bounds.y < existingBounds.y + existingBounds.height &&
          bounds.y + bounds.height > existingBounds.y) {
        return true
      }
    }
    
    // Check if furniture is inside the room boundaries
    if (!isPointInPolygon(furniture.x, furniture.y, room.vertices)) {
      return true
    }
    
    // Check if all corners of furniture are inside the room
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height }
    ]
    
    for (const corner of corners) {
      if (!isPointInPolygon(corner.x, corner.y, room.vertices)) {
        return true
      }
    }
    
    // Check collision with door swing areas
    for (const door of room.doors) {
      const doorPos = getDoorPosition(door)
      if (!doorPos) continue
      
      // Check if furniture intersects with the door swing arc
      if (checkFurnitureIntersectsArc(bounds, doorPos)) {
        return true
      }
    }
    
    return false
  }

  // Helper function to check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = (x: number, y: number, vertices: CanvasVertex[]): boolean => {
    let inside = false
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      if (((vertices[i].y > y) !== (vertices[j].y > y)) &&
          (x < (vertices[j].x - vertices[i].x) * (y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) {
        inside = !inside
      }
    }
    
    return inside
  }

  // Helper function to check if furniture intersects with door swing arc
  const checkFurnitureIntersectsArc = (furnitureBounds: { x: number, y: number, width: number, height: number }, doorPos: any): boolean => {
    const { hingePoint, doorLength } = doorPos
    
    // Get furniture corners
    const corners = [
      { x: furnitureBounds.x, y: furnitureBounds.y },
      { x: furnitureBounds.x + furnitureBounds.width, y: furnitureBounds.y },
      { x: furnitureBounds.x + furnitureBounds.width, y: furnitureBounds.y + furnitureBounds.height },
      { x: furnitureBounds.x, y: furnitureBounds.y + furnitureBounds.height }
    ]
    
    // Check if any corner is within the door swing radius
    for (const corner of corners) {
      const distance = Math.sqrt(
        Math.pow(corner.x - hingePoint.x, 2) + 
        Math.pow(corner.y - hingePoint.y, 2)
      )
      
      if (distance <= doorLength) {
        // Check if the point is within the 90-degree swing arc
        const angleToCorner = Math.atan2(corner.y - hingePoint.y, corner.x - hingePoint.x)
        const angleToOpenEnd = Math.atan2(doorPos.openEnd.y - hingePoint.y, doorPos.openEnd.x - hingePoint.x)
        const angleToSwingEnd = Math.atan2(doorPos.swingEnd.y - hingePoint.y, doorPos.swingEnd.x - hingePoint.x)
        
        // Normalize angles to 0-2π
        const normalizeAngle = (angle: number) => ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI)
        
        const normCornerAngle = normalizeAngle(angleToCorner)
        const normOpenAngle = normalizeAngle(angleToOpenEnd)
        const normSwingAngle = normalizeAngle(angleToSwingEnd)
        
        // Check if corner angle is between open and swing angles
        let isInArc = false
        if (normOpenAngle <= normSwingAngle) {
          isInArc = normCornerAngle >= normOpenAngle && normCornerAngle <= normSwingAngle
        } else {
          isInArc = normCornerAngle >= normOpenAngle || normCornerAngle <= normSwingAngle
        }
        
        if (isInArc) {
          return true
        }
      }
    }
    
    // Also check if furniture center is in the arc
    const centerX = furnitureBounds.x + furnitureBounds.width / 2
    const centerY = furnitureBounds.y + furnitureBounds.height / 2
    const centerDistance = Math.sqrt(
      Math.pow(centerX - hingePoint.x, 2) + 
      Math.pow(centerY - hingePoint.y, 2)
    )
    
    if (centerDistance <= doorLength) {
      const angleToCenter = Math.atan2(centerY - hingePoint.y, centerX - hingePoint.x)
      const angleToOpenEnd = Math.atan2(doorPos.openEnd.y - hingePoint.y, doorPos.openEnd.x - hingePoint.x)
      const angleToSwingEnd = Math.atan2(doorPos.swingEnd.y - hingePoint.y, doorPos.swingEnd.x - hingePoint.x)
      
      const normalizeAngle = (angle: number) => ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI)
      
      const normCenterAngle = normalizeAngle(angleToCenter)
      const normOpenAngle = normalizeAngle(angleToOpenEnd)
      const normSwingAngle = normalizeAngle(angleToSwingEnd)
      
      let isInArc = false
      if (normOpenAngle <= normSwingAngle) {
        isInArc = normCenterAngle >= normOpenAngle && normCenterAngle <= normSwingAngle
      } else {
        isInArc = normCenterAngle >= normOpenAngle || normCenterAngle <= normSwingAngle
      }
      
      if (isInArc) {
        return true
      }
    }
    
    return false
  }

  const isValidPlacement = (furniture: FurnitureItem, excludeId?: string): boolean => {
    if (!room) return false
    
    // Get the shapes for collision detection
    const isLShaped = furniture.type === "l-shaped-desk" || furniture.type === "l-shaped-couch"
    const furnitureRects = isLShaped ? getLShapeRectangles(furniture) : [getFurnitureBounds(furniture)]
    
    // Check collision with other furniture
    for (const existingFurniture of room.furniture) {
      if (existingFurniture.id === excludeId) continue
      
      const isExistingLShaped = existingFurniture.type === "l-shaped-desk" || existingFurniture.type === "l-shaped-couch"
      const existingRects = isExistingLShaped ? getLShapeRectangles(existingFurniture) : [getFurnitureBounds(existingFurniture)]
      
      // Check if any rectangle of the furniture intersects with any rectangle of existing furniture
      for (const furnitureRect of furnitureRects) {
        for (const existingRect of existingRects) {
          if (furnitureRect.x < existingRect.x + existingRect.width &&
              furnitureRect.x + furnitureRect.width > existingRect.x &&
              furnitureRect.y < existingRect.y + existingRect.height &&
              furnitureRect.y + furnitureRect.height > existingRect.y) {
            return false
          }
        }
      }
    }
    
    // Check if furniture center is inside the room boundaries
    if (!isPointInPolygon(furniture.x, furniture.y, room.vertices)) {
      return false
    }
    
    // Check if all corners of all furniture rectangles are inside the room
    for (const rect of furnitureRects) {
      const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
      ]
      
      for (const corner of corners) {
        if (!isPointInPolygon(corner.x, corner.y, room.vertices)) {
          return false
        }
      }
    }
    
    // Check collision with door swing areas
    for (const door of room.doors) {
      const doorPos = getDoorPosition(door)
      if (!doorPos) continue
      
      // Check if any furniture rectangle intersects with the door swing arc
      for (const rect of furnitureRects) {
        if (checkFurnitureIntersectsArc(rect, doorPos)) {
          return false
        }
      }
    }
    
    return true
  }

  // Event handlers
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const { x, y } = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    setMousePosition({ x, y })

    // Handle furniture in placement mode (follows mouse)
    if (furnitureInPlacementMode && selectedFurnitureId) {
      setLocalFurniturePosition({
        id: selectedFurnitureId,
        x,
        y
      })
      
      // Throttle database updates for smoother collaborative experience
      if (onUpdateFurniturePosition) {
        const now = Date.now()
        const timeSinceLastUpdate = now - lastDatabaseUpdateRef.current
        
        // Send update immediately if enough time has passed (60fps = ~16ms)
        if (timeSinceLastUpdate >= 16) {
          onUpdateFurniturePosition(selectedFurnitureId, x, y)
          lastDatabaseUpdateRef.current = now
        } else {
          // Schedule update for the remaining time to maintain consistent rate
          if (databaseUpdateTimeoutRef.current) {
            clearTimeout(databaseUpdateTimeoutRef.current)
          }
          
          databaseUpdateTimeoutRef.current = setTimeout(() => {
            onUpdateFurniturePosition(selectedFurnitureId, x, y)
            lastDatabaseUpdateRef.current = Date.now()
          }, 16 - timeSinceLastUpdate)
        }
      }
      return
    }

    if (isPanning && lastMousePositionRef.current) {
      const { clientWidth, clientHeight } = svg
      if (clientWidth === 0 || clientHeight === 0) return

      const dx = event.clientX - lastMousePositionRef.current.x
      const dy = event.clientY - lastMousePositionRef.current.y

      const scaledDx = (dx / clientWidth) * viewBox.width
      const scaledDy = (dy / clientHeight) * viewBox.height

      setViewBox((prev) => ({
        ...prev,
        x: prev.x - scaledDx,
        y: prev.y - scaledDy,
      }))

      lastMousePositionRef.current = { x: event.clientX, y: event.clientY }
    }
  }

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) return
    
    // If placing furniture, confirm placement
    if (furnitureBeingPlaced && onConfirmFurniturePlacement) {
      const furnitureAtMouse = { ...furnitureBeingPlaced, x: mousePosition.x, y: mousePosition.y }
      if (isValidPlacement(furnitureAtMouse)) {
        onConfirmFurniturePlacement(furnitureAtMouse)
      }
      return
    }
    
    // If we have furniture in placement mode, try to place it
    if (furnitureInPlacementMode && selectedFurnitureId && localFurniturePosition) {
      const furnitureToPlace = room?.furniture.find(f => f.id === selectedFurnitureId)
      if (furnitureToPlace) {
        const testFurniture = {
          ...furnitureToPlace,
          x: localFurniturePosition.x,
          y: localFurniturePosition.y,
          rotation: localFurniturePosition.rotation || furnitureToPlace.rotation
        }
        
        // Check if placement is valid
        if (isValidPlacement(testFurniture, selectedFurnitureId)) {
          // Valid placement - confirm and exit placement mode
          setFurnitureInPlacementMode(null)
          setLocalFurniturePosition(null)
          
          // Add to recently placed furniture to prevent interpolation echo
          setRecentlyPlacedFurniture(prev => new Set(prev).add(selectedFurnitureId))
          
          // Clear any interpolation for this furniture
          setInterpolatedPositions(prev => {
            const newMap = new Map(prev)
            newMap.delete(selectedFurnitureId)
            return newMap
          })
          
          // Clear any pending database updates and send final position
          if (databaseUpdateTimeoutRef.current) {
            clearTimeout(databaseUpdateTimeoutRef.current)
            databaseUpdateTimeoutRef.current = null
          }
          
          onUpdateFurniturePosition?.(selectedFurnitureId, testFurniture.x, testFurniture.y, testFurniture.rotation)
          onDeselectFurniture?.(selectedFurnitureId)
          setSelectedFurnitureId(null)
        }
        // If invalid placement, furniture stays in placement mode and shows visual feedback
      }
      return
    }
    
    // Check if clicking on existing furniture to select it
    if (room) {
      for (const furniture of room.furniture) {
        const effectiveFurniture = getEffectiveFurniture(furniture)
        const bounds = getFurnitureBounds(effectiveFurniture)
        if (mousePosition.x >= bounds.x && mousePosition.x <= bounds.x + bounds.width &&
            mousePosition.y >= bounds.y && mousePosition.y <= bounds.y + bounds.height) {
          
          // If furniture is already selected by someone else, don't allow interaction
          if (furniture.isSelected && selectedFurnitureId !== furniture.id) {
            return
          }
          
          // Immediately select the furniture and enter placement mode
          onSelectFurniture?.(furniture.id)
          setSelectedFurnitureId(furniture.id)
          setFurnitureInPlacementMode(furniture.id)
          setLocalFurniturePosition({
            id: furniture.id,
            x: effectiveFurniture.x,
            y: effectiveFurniture.y,
            rotation: effectiveFurniture.rotation
          })
          return
        }
      }
    }
    
    // Click on empty space - deselect/cancel
    if (selectedFurnitureId) {
      // If in placement mode, cancel placement and return to original position
      if (furnitureInPlacementMode) {
        setFurnitureInPlacementMode(null)
        setLocalFurniturePosition(null)
        
        // Add to recently placed furniture to prevent interpolation echo
        setRecentlyPlacedFurniture(prev => new Set(prev).add(selectedFurnitureId))
        
        // Clear any interpolation for this furniture
        setInterpolatedPositions(prev => {
          const newMap = new Map(prev)
          newMap.delete(selectedFurnitureId)
          return newMap
        })
        
        // Clear any pending database updates
        if (databaseUpdateTimeoutRef.current) {
          clearTimeout(databaseUpdateTimeoutRef.current)
          databaseUpdateTimeoutRef.current = null
        }
      }
      
      onDeselectFurniture?.(selectedFurnitureId)
      setSelectedFurnitureId(null)
    }
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle escape key for canceling placement
    if (event.key === "Escape") {
      if (furnitureBeingPlaced && onCancelFurniturePlacement) {
        onCancelFurniturePlacement()
      }
      
      // Cancel furniture placement mode
      if (furnitureInPlacementMode && selectedFurnitureId) {
        setFurnitureInPlacementMode(null)
        setLocalFurniturePosition(null)
        
        // Add to recently placed furniture to prevent interpolation echo
        setRecentlyPlacedFurniture(prev => new Set(prev).add(selectedFurnitureId))
        
        // Clear any interpolation for this furniture
        setInterpolatedPositions(prev => {
          const newMap = new Map(prev)
          newMap.delete(selectedFurnitureId)
          return newMap
        })
        
        // Clear any pending database updates
        if (databaseUpdateTimeoutRef.current) {
          clearTimeout(databaseUpdateTimeoutRef.current)
          databaseUpdateTimeoutRef.current = null
        }
        
        onDeselectFurniture?.(selectedFurnitureId)
        setSelectedFurnitureId(null)
      }
      return
    }
    
    // Handle arrow keys for rotation during placement
    if (furnitureBeingPlaced && onUpdateFurnitureBeingPlaced && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      event.stopPropagation()
      
      const rotationChange = event.key === "ArrowLeft" ? -90 : 90
      const newRotation = ((furnitureBeingPlaced.rotation + rotationChange + 360) % 360) as 0 | 90 | 180 | 270
      
      const updatedFurniture = { ...furnitureBeingPlaced, rotation: newRotation }
      onUpdateFurnitureBeingPlaced(updatedFurniture)
      return
    }
    
    // Handle arrow keys for rotation during furniture placement mode
    if (furnitureInPlacementMode && selectedFurnitureId && localFurniturePosition && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      event.stopPropagation()
      
      const currentRotation = localFurniturePosition.rotation || 0
      const rotationChange = event.key === "ArrowLeft" ? -90 : 90
      const newRotation = ((currentRotation + rotationChange + 360) % 360) as 0 | 90 | 180 | 270
      
      setLocalFurniturePosition({
        ...localFurniturePosition,
        rotation: newRotation
      })
      
      // Update database for other users
      if (onUpdateFurniturePosition) {
        onUpdateFurniturePosition(selectedFurnitureId, localFurniturePosition.x, localFurniturePosition.y, newRotation)
      }
      return
    }
  }, [
    furnitureBeingPlaced, 
    onCancelFurniturePlacement, 
    onUpdateFurnitureBeingPlaced, 
    furnitureInPlacementMode, 
    selectedFurnitureId, 
    localFurniturePosition,
    onDeselectFurniture,
    onUpdateFurniturePosition
  ])

  useEffect(() => {
    const handleKeyDownCapture = (event: KeyboardEvent) => {
      handleKeyDown(event)
    }
    
    // Use capture phase to intercept arrow keys before they reach other elements
    document.addEventListener("keydown", handleKeyDownCapture, true)
    return () => document.removeEventListener("keydown", handleKeyDownCapture, true)
  }, [handleKeyDown])

  // Cleanup database update timeout on unmount
  useEffect(() => {
    return () => {
      if (databaseUpdateTimeoutRef.current) {
        clearTimeout(databaseUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Observe container size
  useEffect(() => {
    const container = svgContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasDimensions({ width, height })
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.unobserve(container)
  }, [])

  // Fit room to view when room or canvas dimensions change
  useEffect(() => {
    if (
      !room ||
      room.vertices.length < 1 ||
      canvasDimensions.width === 0 ||
      canvasDimensions.height === 0
    ) {
      setViewBox({
        x: -canvasDimensions.width / 2,
        y: -canvasDimensions.height / 2,
        width: canvasDimensions.width || 100,
        height: canvasDimensions.height || 100,
      })
      return
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    room.vertices.forEach((v) => {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
    })

    if (minX === Infinity) {
      setViewBox({
        x: -canvasDimensions.width / 2,
        y: -canvasDimensions.height / 2,
        width: canvasDimensions.width,
        height: canvasDimensions.height,
      })
      return
    }

    const roomWidth = Math.max(1, maxX - minX)
    const roomHeight = Math.max(1, maxY - minY)

    const scaleX = canvasDimensions.width / (roomWidth + padding * 2)
    const scaleY = canvasDimensions.height / (roomHeight + padding * 2)
    const finalScale = Math.min(scaleX, scaleY)

    const newViewBoxWidth = canvasDimensions.width / finalScale
    const newViewBoxHeight = canvasDimensions.height / finalScale

    const newViewBoxX = minX - (newViewBoxWidth - roomWidth) / 2
    const newViewBoxY = minY - (newViewBoxHeight - roomHeight) / 2

    setViewBox({
      x: newViewBoxX,
      y: newViewBoxY,
      width: newViewBoxWidth,
      height: newViewBoxHeight,
    })
  }, [room, canvasDimensions, padding])

  const generatePathData = (vertices: CanvasVertex[]): string => {
    if (!vertices || vertices.length === 0) return ""
    const pathParts = vertices.map(
      (v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`,
    )
    return `${pathParts.join(" ")} Z`
  }

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const svg = event.currentTarget
    const { clientWidth, clientHeight } = svg
    if (clientWidth === 0 || clientHeight === 0) return

    const zoomIntensity = 0.1
    const direction = event.deltaY < 0 ? 1 : -1
    const zoomFactor = 1 + direction * zoomIntensity

    const rect = svg.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const pointBeforeZoomX = viewBox.x + (mouseX / clientWidth) * viewBox.width
    const pointBeforeZoomY = viewBox.y + (mouseY / clientHeight) * viewBox.height

    const newViewBoxWidth = viewBox.width / zoomFactor
    const newViewBoxHeight = viewBox.height / zoomFactor

    const newViewBoxX = pointBeforeZoomX - (mouseX / clientWidth) * newViewBoxWidth
    const newViewBoxY = pointBeforeZoomY - (mouseY / clientHeight) * newViewBoxHeight

    setViewBox({
      x: newViewBoxX,
      y: newViewBoxY,
      width: newViewBoxWidth,
      height: newViewBoxHeight,
    })
  }

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    if (furnitureBeingPlaced || furnitureInPlacementMode) return // Don't pan while placing furniture
    
    setIsPanning(true)
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.style.cursor = "grabbing"
  }

  const handleMouseUpOrLeave = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false)
      lastMousePositionRef.current = null
      event.currentTarget.style.cursor = furnitureBeingPlaced ? "crosshair" : (furnitureInPlacementMode ? "crosshair" : "grab")
    }
  }

  const renderFurniture = (furniture: FurnitureItem, isPreview: boolean = false) => {
    const isSelected = furniture.isSelected || false
    const isInPlacementMode = furnitureInPlacementMode === furniture.id
    const isValid = isPreview ? isValidPlacement(furniture) : (isInPlacementMode ? isValidPlacement(furniture, furniture.id) : true)
    
    // Determine visual styling
    let fillColor = getFurnitureColor(furniture.type, isValid, isSelected)
    let strokeColor = "#333"
    let strokeWidth = 1
    let opacity = 1
    
    if (isPreview) {
      opacity = 0.7
      strokeColor = isValid ? "#007bff" : "#ef4444"
      strokeWidth = 2
    } else if (isInPlacementMode) {
      opacity = 0.8
      strokeColor = isValid ? "#22c55e" : "#ef4444" // Green for valid, red for invalid
      strokeWidth = 3
      if (!isValid) {
        fillColor = fillColor.replace(/[\d.]+\)$/, "0.3)") // Make invalid placement more transparent
      }
    } else if (isSelected) {
      opacity = 0.6
      strokeColor = "#007bff"
      strokeWidth = 3
    }

    if (furniture.type === "circular-table") {
      const radius = (furniture.diameter || 0) * PIXELS_PER_INCH / 2
      return (
        <circle
          key={furniture.id}
          cx={furniture.x}
          cy={furniture.y}
          r={radius}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      )
    }

    if (furniture.type === "l-shaped-desk" || furniture.type === "l-shaped-couch") {
      const rectangles = getLShapeRectangles(furniture)
      
      return (
        <g key={furniture.id} opacity={opacity}>
          {rectangles.map((rect, index) => (
            <rect
              key={`${furniture.id}-${index}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          ))}
          
          {/* L-shaped couch backrest and armrests */}
          {furniture.type === "l-shaped-couch" && (() => {
            const elements = [];
            const length = furniture.length * PIXELS_PER_INCH;
            const width = furniture.width * PIXELS_PER_INCH;
            const depth = (furniture.depth || 0) * PIXELS_PER_INCH;
            const insetInches = 5;
            const insetPixels = insetInches * PIXELS_PER_INCH;
            
            switch (furniture.rotation) {
              case 0: // L opening to bottom-right
                // Backrest along inner edge of horizontal leg (top edge)
                elements.push(
                  <line
                    key="horizontal-backrest"
                    x1={furniture.x - length / 2}
                    y1={furniture.y + width / 2 - depth}
                    x2={furniture.x + length / 2 - depth}
                    y2={furniture.y + width / 2 - depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Backrest along inner edge of vertical leg (left edge)
                elements.push(
                  <line
                    key="vertical-backrest"
                    x1={furniture.x + length / 2 - depth}
                    y1={furniture.y - width / 2}
                    x2={furniture.x + length / 2 - depth}
                    y2={furniture.y + width / 2 - depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Left armrest (outer end of horizontal leg)
                elements.push(
                  <line
                    key="left-armrest"
                    x1={furniture.x - length / 2}
                    y1={furniture.y + width / 2 - depth}
                    x2={furniture.x - length / 2}
                    y2={furniture.y + width / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Top armrest (outer end of vertical leg)
                elements.push(
                  <line
                    key="top-armrest"
                    x1={furniture.x + length / 2 - depth}
                    y1={furniture.y - width / 2}
                    x2={furniture.x + length / 2}
                    y2={furniture.y - width / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                break;
                
              case 90: // L opening to bottom-left
                // Backrest along inner edge of horizontal leg (top edge)
                elements.push(
                  <line
                    key="horizontal-backrest"
                    x1={furniture.x - width / 2 + depth}
                    y1={furniture.y + length / 2 - depth}
                    x2={furniture.x + width / 2}
                    y2={furniture.y + length / 2 - depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Backrest along inner edge of vertical leg (right edge)
                elements.push(
                  <line
                    key="vertical-backrest"
                    x1={furniture.x - width / 2 + depth}
                    y1={furniture.y - length / 2}
                    x2={furniture.x - width / 2 + depth}
                    y2={furniture.y + length / 2 - depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Right armrest (outer end of horizontal leg)
                elements.push(
                  <line
                    key="right-armrest"
                    x1={furniture.x + width / 2}
                    y1={furniture.y + length / 2 - depth}
                    x2={furniture.x + width / 2}
                    y2={furniture.y + length / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Top armrest (outer end of vertical leg)
                elements.push(
                  <line
                    key="top-armrest"
                    x1={furniture.x - width / 2}
                    y1={furniture.y - length / 2}
                    x2={furniture.x - width / 2 + depth}
                    y2={furniture.y - length / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                break;
                
              case 180: // L opening to top-left
                // Backrest along inner edge of horizontal leg (bottom edge)
                elements.push(
                  <line
                    key="horizontal-backrest"
                    x1={furniture.x - length / 2 + depth}
                    y1={furniture.y - width / 2 + depth}
                    x2={furniture.x + length / 2}
                    y2={furniture.y - width / 2 + depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Backrest along inner edge of vertical leg (right edge)
                elements.push(
                  <line
                    key="vertical-backrest"
                    x1={furniture.x - length / 2 + depth}
                    y1={furniture.y - width / 2 + depth}
                    x2={furniture.x - length / 2 + depth}
                    y2={furniture.y + width / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Right armrest (outer end of horizontal leg)
                elements.push(
                  <line
                    key="right-armrest"
                    x1={furniture.x + length / 2}
                    y1={furniture.y - width / 2}
                    x2={furniture.x + length / 2}
                    y2={furniture.y - width / 2 + depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Bottom armrest (outer end of vertical leg)
                elements.push(
                  <line
                    key="bottom-armrest"
                    x1={furniture.x - length / 2}
                    y1={furniture.y + width / 2}
                    x2={furniture.x - length / 2 + depth}
                    y2={furniture.y + width / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                break;
                
              case 270: // L opening to top-right
                // Backrest along inner edge of horizontal leg (bottom edge)
                elements.push(
                  <line
                    key="horizontal-backrest"
                    x1={furniture.x - width / 2}
                    y1={furniture.y - length / 2 + depth}
                    x2={furniture.x + width / 2 - depth}
                    y2={furniture.y - length / 2 + depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Backrest along inner edge of vertical leg (left edge)
                elements.push(
                  <line
                    key="vertical-backrest"
                    x1={furniture.x + width / 2 - depth}
                    y1={furniture.y - length / 2 + depth}
                    x2={furniture.x + width / 2 - depth}
                    y2={furniture.y + length / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Left armrest (outer end of horizontal leg)
                elements.push(
                  <line
                    key="left-armrest"
                    x1={furniture.x - width / 2}
                    y1={furniture.y - length / 2}
                    x2={furniture.x - width / 2}
                    y2={furniture.y - length / 2 + depth}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                // Bottom armrest (outer end of vertical leg)
                elements.push(
                  <line
                    key="bottom-armrest"
                    x1={furniture.x + width / 2 - depth}
                    y1={furniture.y + length / 2}
                    x2={furniture.x + width / 2}
                    y2={furniture.y + length / 2}
                    stroke="black"
                    strokeWidth="2"
                  />
                );
                break;
            }
            
            return elements;
          })()}
        </g>
      )
    }

    const length = furniture.length * PIXELS_PER_INCH
    const width = furniture.width * PIXELS_PER_INCH
    
    // Handle rotation
    let rectWidth = length
    let rectHeight = width
    if (furniture.rotation === 90 || furniture.rotation === 270) {
      rectWidth = width
      rectHeight = length
    }

    return (
      <g key={furniture.id} opacity={opacity}>
        <rect
          x={furniture.x - rectWidth / 2}
          y={furniture.y - rectHeight / 2}
          width={rectWidth}
          height={rectHeight}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Bed headboard */}
        {furniture.type === "bed" && (() => {
          let headboardX, headboardY, headboardWidth, headboardHeight;
          
          switch (furniture.rotation) {
            case 0: // Default orientation
              headboardX = furniture.x - rectWidth / 2;
              headboardY = furniture.y - rectHeight / 2;
              headboardWidth = rectWidth;
              headboardHeight = rectHeight * 0.2;
              break;
            case 90: // Rotated 90° clockwise
              headboardX = furniture.x + rectWidth / 2 - rectWidth * 0.2;
              headboardY = furniture.y - rectHeight / 2;
              headboardWidth = rectWidth * 0.2;
              headboardHeight = rectHeight;
              break;
            case 180: // Rotated 180°
              headboardX = furniture.x - rectWidth / 2;
              headboardY = furniture.y + rectHeight / 2 - rectHeight * 0.2;
              headboardWidth = rectWidth;
              headboardHeight = rectHeight * 0.2;
              break;
            case 270: // Rotated 270° clockwise
              headboardX = furniture.x - rectWidth / 2;
              headboardY = furniture.y - rectHeight / 2;
              headboardWidth = rectWidth * 0.2;
              headboardHeight = rectHeight;
              break;
            default:
              headboardX = furniture.x - rectWidth / 2;
              headboardY = furniture.y - rectHeight / 2;
              headboardWidth = rectWidth;
              headboardHeight = rectHeight * 0.2;
          }
          
          return (
            <rect
              x={headboardX}
              y={headboardY}
              width={headboardWidth}
              height={headboardHeight}
              fill="white"
            />
          );
        })()}
        
        {/* Couch backrest and arms */}
        {furniture.type === "couch" && (() => {
          const elements = [];
          const insetInches = 5;
          const insetPixels = insetInches * PIXELS_PER_INCH;
          
          switch (furniture.rotation) {
            case 0: // Default orientation - backrest at top
              // Backrest line (horizontal, 5" from top edge)
              elements.push(
                <line
                  key="backrest"
                  x1={furniture.x - rectWidth / 2}
                  y1={furniture.y - rectHeight / 2 + insetPixels}
                  x2={furniture.x + rectWidth / 2}
                  y2={furniture.y - rectHeight / 2 + insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Left arm (vertical, 5" from left edge)
              elements.push(
                <line
                  key="left-arm"
                  x1={furniture.x - rectWidth / 2 + insetPixels}
                  y1={furniture.y + rectHeight / 2}
                  x2={furniture.x - rectWidth / 2 + insetPixels}
                  y2={furniture.y - rectHeight / 2 + insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Right arm (vertical, 5" from right edge)
              elements.push(
                <line
                  key="right-arm"
                  x1={furniture.x + rectWidth / 2 - insetPixels}
                  y1={furniture.y + rectHeight / 2}
                  x2={furniture.x + rectWidth / 2 - insetPixels}
                  y2={furniture.y - rectHeight / 2 + insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              break;
              
            case 90: // Rotated 90° - backrest at right
              // Backrest line (vertical, 5" from right edge)
              elements.push(
                <line
                  key="backrest"
                  x1={furniture.x + rectWidth / 2 - insetPixels}
                  y1={furniture.y - rectHeight / 2}
                  x2={furniture.x + rectWidth / 2 - insetPixels}
                  y2={furniture.y + rectHeight / 2}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Top arm (horizontal, 5" from top edge)
              elements.push(
                <line
                  key="top-arm"
                  x1={furniture.x - rectWidth / 2}
                  y1={furniture.y - rectHeight / 2 + insetPixels}
                  x2={furniture.x + rectWidth / 2 - insetPixels}
                  y2={furniture.y - rectHeight / 2 + insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Bottom arm (horizontal, 5" from bottom edge)
              elements.push(
                <line
                  key="bottom-arm"
                  x1={furniture.x - rectWidth / 2}
                  y1={furniture.y + rectHeight / 2 - insetPixels}
                  x2={furniture.x + rectWidth / 2 - insetPixels}
                  y2={furniture.y + rectHeight / 2 - insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              break;
              
            case 180: // Rotated 180° - backrest at bottom
              // Backrest line (horizontal, 5" from bottom edge)
              elements.push(
                <line
                  key="backrest"
                  x1={furniture.x - rectWidth / 2}
                  y1={furniture.y + rectHeight / 2 - insetPixels}
                  x2={furniture.x + rectWidth / 2}
                  y2={furniture.y + rectHeight / 2 - insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Left arm (vertical, 5" from left edge)
              elements.push(
                <line
                  key="left-arm"
                  x1={furniture.x - rectWidth / 2 + insetPixels}
                  y1={furniture.y - rectHeight / 2}
                  x2={furniture.x - rectWidth / 2 + insetPixels}
                  y2={furniture.y + rectHeight / 2 - insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Right arm (vertical, 5" from right edge)
              elements.push(
                <line
                  key="right-arm"
                  x1={furniture.x + rectWidth / 2 - insetPixels}
                  y1={furniture.y - rectHeight / 2}
                  x2={furniture.x + rectWidth / 2 - insetPixels}
                  y2={furniture.y + rectHeight / 2 - insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              break;
              
            case 270: // Rotated 270° - backrest at left
              // Backrest line (vertical, 5" from left edge)
              elements.push(
                <line
                  key="backrest"
                  x1={furniture.x - rectWidth / 2 + insetPixels}
                  y1={furniture.y - rectHeight / 2}
                  x2={furniture.x - rectWidth / 2 + insetPixels}
                  y2={furniture.y + rectHeight / 2}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Top arm (horizontal, 5" from top edge)
              elements.push(
                <line
                  key="top-arm"
                  x1={furniture.x - rectWidth / 2 + insetPixels}
                  y1={furniture.y - rectHeight / 2 + insetPixels}
                  x2={furniture.x + rectWidth / 2}
                  y2={furniture.y - rectHeight / 2 + insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              // Bottom arm (horizontal, 5" from bottom edge)
              elements.push(
                <line
                  key="bottom-arm"
                  x1={furniture.x - rectWidth / 2 + insetPixels}
                  y1={furniture.y + rectHeight / 2 - insetPixels}
                  x2={furniture.x + rectWidth / 2}
                  y2={furniture.y + rectHeight / 2 - insetPixels}
                  stroke="black"
                  strokeWidth="2"
                />
              );
              break;
          }
          
          return elements;
        })()}
      </g>
    )
  }

  const roomPathData = room ? generatePathData(room.vertices) : ""

  return (
    <div
      ref={svgContainerRef}
      className={className || "w-full h-full bg-background"}
      style={{ touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClick={handleClick}
        style={{ cursor: furnitureBeingPlaced ? "crosshair" : (furnitureInPlacementMode ? "crosshair" : "grab"), userSelect: "none" }}
      >
        {/* Room Shape */}
        {room && roomPathData && (
          <path
            d={roomPathData}
            fill={roomFillColor}
            stroke={roomStrokeColor}
            strokeWidth={roomStrokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Doors */}
        {room && room.doors && room.doors.map((door) => {
          const doorPos = getDoorPosition(door)
          if (!doorPos) return null

          return (
            <g key={door.id}>
              <line
                x1={doorPos.doorStart.x}
                y1={doorPos.doorStart.y}
                x2={doorPos.doorEnd.x}
                y2={doorPos.doorEnd.y}
                stroke="#3b82f6"
                strokeWidth={4}
              />
              
              <path
                d={`M ${doorPos.hingePoint.x} ${doorPos.hingePoint.y} L ${doorPos.openEnd.x} ${doorPos.openEnd.y} A ${doorPos.doorLength} ${doorPos.doorLength} 0 0 ${doorPos.sweepFlag} ${doorPos.swingEnd.x} ${doorPos.swingEnd.y} Z`}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            </g>
          )
        })}

        {/* Existing Furniture */}
        {room && room.furniture.map((furniture) => {
          const effectiveFurniture = getEffectiveFurniture(furniture)
          return renderFurniture(effectiveFurniture)
        })}

        {/* Furniture Being Placed */}
        {furnitureBeingPlaced && (
          renderFurniture({
            ...furnitureBeingPlaced,
            x: mousePosition.x,
            y: mousePosition.y,
          }, true)
        )}
      </svg>
      
      {/* Instructions */}
      {furnitureBeingPlaced && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-sm">
          Click to place furniture • ← → to rotate • ESC to cancel
        </div>
      )}
      
      {furnitureInPlacementMode && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-sm">
          Move furniture with mouse • ← → to rotate • Click to place • ESC to cancel
        </div>
      )}
      
      {!furnitureBeingPlaced && !furnitureInPlacementMode && room && room.furniture.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/80 text-white p-2 rounded text-sm">
          Click furniture to select • Click selected furniture to move
        </div>
      )}
    </div>
  )
}

export default RoomDisplayCanvas