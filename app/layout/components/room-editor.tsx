// components/room-editor.tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import ShapeEditorCanvas from "./shape-editor-canvas" 
import type { CanvasVertex, CanvasSegment } from "./shape-editor-canvas" 
import { Lock, Unlock, ZoomIn, ZoomOut, Hand, RotateCw, RotateCcw, DoorOpen, ArrowLeftRight, Pen, Trash2 } from "lucide-react"

export type DoorDirection = "in" | "out"
export type DoorSize = 32 | 36
export type HingeSide = "left" | "right"

export type Door = {
  id: string
  segmentId: string // Which wall segment this door is on
  position: number // 0-1, position along the segment (0 = start vertex, 1 = end vertex)
  size: DoorSize // Width in inches
  direction: DoorDirection // Which way the door opens
  hingeSide: HingeSide // Which side the hinge is on
}

export type RoomShape = {
  id: string
  name: string
  vertices: CanvasVertex[]
  segments: CanvasSegment[]
  doors: Door[]
}

interface RoomEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (room: RoomShape) => void
  initialRoom: RoomShape | null
}

const PIXELS_PER_INCH = 4
const GRID_SIZE_INCHES = 1
const GRID_SIZE_PIXELS = GRID_SIZE_INCHES * PIXELS_PER_INCH
const CANVAS_WIDTH = 800; // Define canvas width
const CANVAS_HEIGHT = 600; // Define canvas height

const RoomEditor: React.FC<RoomEditorProps> = ({ isOpen, onClose, onSave, initialRoom }) => {
  const [roomName, setRoomName] = useState("")
  const [vertices, setVertices] = useState<CanvasVertex[]>([])
  const [segments, setSegments] = useState<CanvasSegment[]>([])
  const [doors, setDoors] = useState<Door[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null)
  const [drawingMode, setDrawingMode] = useState<"draw" | "pan" | "door">("draw")
  const [previewLine, setPreviewLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null)
  const [previewLineLength, setPreviewLineLength] = useState<number | null>(null)
  const [previewDoor, setPreviewDoor] = useState<Door | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editableLengthInches, setEditableLengthInches] = useState<string>("")

  // SVG ViewBox and Zoom/Pan state
  const [viewBoxX, setViewBoxX] = useState(0)
  const [viewBoxY, setViewBoxY] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (isOpen) { // Reset state when dialog opens
        if (initialRoom) {
            setRoomName(initialRoom.name)
            setVertices(initialRoom.vertices)
            setSegments(initialRoom.segments)
            setDoors(initialRoom.doors || [])
        } else {
            setRoomName("")
            setVertices([])
            setSegments([])
            setDoors([])
        }
        setSelectedSegmentId(null)
        setSelectedDoorId(null)
        setPreviewLine(null)
        setPreviewLineLength(null)
        setPreviewDoor(null)
        setErrorMessage(null)
        setEditableLengthInches("")
        // Reset view
        setViewBoxX(0)
        setViewBoxY(0)
        setZoomLevel(1)
        setDrawingMode("draw")
    }
  }, [initialRoom, isOpen])

  const getVertexById = useCallback((id: string) => vertices.find((v) => v.id === id), [vertices])
  const getSegmentById = useCallback((id: string) => segments.find((s) => s.id === id), [segments])
  const getDoorById = useCallback((id: string) => doors.find((d) => d.id === id), [doors])

  useEffect(() => {
    if (selectedSegmentId) {
      const segment = getSegmentById(selectedSegmentId)
      if (segment) {
        const v1 = getVertexById(segment.v1_id)
        const v2 = getVertexById(segment.v2_id)
        if (v1 && v2) {
          const lengthPixels = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2))
          setEditableLengthInches((lengthPixels / PIXELS_PER_INCH).toFixed(0))
        }
      }
    } else {
      setEditableLengthInches("")
    }
  }, [selectedSegmentId, segments, vertices, getSegmentById, getVertexById])

  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE_PIXELS) * GRID_SIZE_PIXELS

  const handleCanvasInteraction = (point: { x: number; y: number }, event: React.MouseEvent<SVGSVGElement | SVGLineElement | SVGCircleElement>) => {
    if (drawingMode === "door") {
      handleDoorPlacement(point)
      return
    }
    
    if (drawingMode === "pan") {
        if (event.type === "mousedown") {
            setIsPanning(true);
            lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
        }
        return;
    }
    
    // If it's a click on a segment or vertex, it's handled by their specific handlers
    if (event.target !== event.currentTarget && event.type === "click") {
        return;
    }
    
    // Drawing logic for canvas click
    setErrorMessage(null)
    const snappedPoint = { x: snapToGrid(point.x), y: snapToGrid(point.y) }

    if (vertices.length === 0) { // Start drawing
      const newVertex: CanvasVertex = { id: uuidv4(), ...snappedPoint }
      setVertices([newVertex])
      setPreviewLine({ start: newVertex, end: newVertex }) // Start preview from this point
    } else if (previewLine) { // If previewLine exists, we are in the process of drawing the next point
      const lastVertex = vertices[vertices.length - 1]
      let finalNewPoint = { ...snappedPoint } // Use the snapped point from the click

      // Enforce 90-degree angles based on the *previous* segment
      if (vertices.length === 1) { // Drawing the first segment, determine orientation
        const dx = Math.abs(finalNewPoint.x - lastVertex.x);
        const dy = Math.abs(finalNewPoint.y - lastVertex.y);
        if (dx > dy) { // Prefer horizontal
            finalNewPoint.y = lastVertex.y;
        } else { // Prefer vertical
            finalNewPoint.x = lastVertex.x;
        }
      } else if (vertices.length > 1) { // Drawing subsequent segments
        const penultimateVertex = vertices[vertices.length - 2];
        const lastSegmentWasHorizontal = Math.abs(lastVertex.y - penultimateVertex.y) < 0.1;

        if (lastSegmentWasHorizontal) { // Last was horizontal, new must be vertical
            finalNewPoint.x = lastVertex.x;
        } else { // Last was vertical, new must be horizontal
            finalNewPoint.y = lastVertex.y;
        }
      }
      
      if (finalNewPoint.x === lastVertex.x && finalNewPoint.y === lastVertex.y) return; // Avoid zero-length

      const newVertex: CanvasVertex = { id: uuidv4(), ...finalNewPoint }
      const newSegment: CanvasSegment = {
        id: uuidv4(),
        v1_id: lastVertex.id,
        v2_id: newVertex.id,
        isLocked: false,
      }
      setVertices([...vertices, newVertex])
      setSegments([...segments, newSegment])
      setSelectedSegmentId(newSegment.id)
      setPreviewLine({ start: newVertex, end: newVertex }) // Reset preview for next segment
    }
  }

  const handleCanvasMouseMove = (point: { x: number; y: number }, event: React.MouseEvent<SVGSVGElement>) => {
    if (drawingMode === "door") {
      const nearest = findNearestSegment(point)
      if (nearest) {
        setPreviewDoor({
          id: "preview",
          segmentId: nearest.segment.id,
          position: nearest.position,
          size: 32,
          direction: "in",
          hingeSide: "left",
        })
      } else {
        setPreviewDoor(null)
      }
      return
    }

    if (drawingMode === "pan" && isPanning && lastMousePositionRef.current) {
        const dx = (event.clientX - lastMousePositionRef.current.x) / zoomLevel;
        const dy = (event.clientY - lastMousePositionRef.current.y) / zoomLevel;
        setViewBoxX(prev => prev - dx);
        setViewBoxY(prev => prev - dy);
        lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
        return;
    }

    if (drawingMode === "draw" && previewLine && vertices.length > 0) {
      const lastVertex = vertices[vertices.length - 1]
      let snappedEndPoint = { x: snapToGrid(point.x), y: snapToGrid(point.y) }

      if (vertices.length === 1) { // First segment: snap to horizontal or vertical from start
        const dx = Math.abs(snappedEndPoint.x - lastVertex.x);
        const dy = Math.abs(snappedEndPoint.y - lastVertex.y);
        if (dx > dy) { // Horizontal
            snappedEndPoint.y = lastVertex.y;
        } else { // Vertical
            snappedEndPoint.x = lastVertex.x;
        }
      } else if (vertices.length > 1) { // Subsequent segments: enforce 90 degrees
        const penultimateVertex = vertices[vertices.length - 2];
        const lastSegmentWasHorizontal = Math.abs(lastVertex.y - penultimateVertex.y) < 0.1; // Check if previous segment was horizontal

        if (lastSegmentWasHorizontal) { // If last was horizontal, current preview must be vertical
            snappedEndPoint.x = lastVertex.x;
        } else { // If last was vertical, current preview must be horizontal
            snappedEndPoint.y = lastVertex.y;
        }
      }
      
      // Calculate length in inches
      const lengthPixels = Math.sqrt(Math.pow(snappedEndPoint.x - previewLine.start.x, 2) + Math.pow(snappedEndPoint.y - previewLine.start.y, 2))
      const lengthInches = lengthPixels / PIXELS_PER_INCH
      
      setPreviewLine({ start: previewLine.start, end: snappedEndPoint })
      setPreviewLineLength(lengthInches)
    }
  }
  
  const handleMouseUpOnCanvas = () => {
    if (drawingMode === "pan") {
        setIsPanning(false);
        lastMousePositionRef.current = null;
    }
  }


  const handleSegmentSelect = (segmentId: string, event: React.MouseEvent<SVGLineElement>) => {
    event.stopPropagation(); // Prevent canvas click
    if (drawingMode === "draw") {
        setSelectedSegmentId(segmentId);
        setSelectedDoorId(null); // Clear door selection when selecting a segment
    }
  }

  const handleSetLength = () => {
    if (!selectedSegmentId) return
    const segment = getSegmentById(selectedSegmentId)
    if (!segment || segment.isLocked) {
      setErrorMessage(segment?.isLocked ? "Cannot change length of a locked wall." : "No segment selected.");
      return
    }

    const v1 = getVertexById(segment.v1_id)
    const v2 = getVertexById(segment.v2_id)
    const newLengthParsed = parseFloat(editableLengthInches)

    if (!v1 || !v2 || isNaN(newLengthParsed) || newLengthParsed <=0) {
      setErrorMessage("Invalid length.");
      return
    }
    
    const newLengthPixels = newLengthParsed * PIXELS_PER_INCH
    const dx = v2.x - v1.x
    const dy = v2.y - v1.y
    const currentLengthPixels = Math.sqrt(dx * dx + dy * dy)

    if (Math.abs(currentLengthPixels) < 0.001 && Math.abs(newLengthPixels) < 0.001) return; // No change if both are zero
    if (Math.abs(currentLengthPixels) < 0.001 && Math.abs(newLengthPixels) > 0.001) {
        // This case is tricky: segment has zero length, how to give it direction?
        // For now, we can't reliably set length for a zero-length segment without more info.
        setErrorMessage("Cannot set length for a zero-length segment. Redraw or delete.");
        return;
    }


    const newV2_x = v1.x + (dx / currentLengthPixels) * newLengthPixels
    const newV2_y = v1.y + (dy / currentLengthPixels) * newLengthPixels
    
    const updatedVertices = vertices.map(v => 
      v.id === v2.id ? { ...v, x: snapToGrid(newV2_x), y: snapToGrid(newV2_y) } : v
    );
    setVertices(updatedVertices)
    // This is where the advanced adjustment logic would kick in for connected segments.
    setErrorMessage("Shape may be distorted by length change. Advanced adjustment needed for complex shapes.");
  }

  const handleLengthChange = (value: string) => {
    setEditableLengthInches(value)
    
    // Auto-update if valid
    if (!selectedSegmentId) return
    const segment = getSegmentById(selectedSegmentId)
    if (!segment || segment.isLocked) return

    const v1 = getVertexById(segment.v1_id)
    const v2 = getVertexById(segment.v2_id)
    const newLengthParsed = parseFloat(value)

    if (!v1 || !v2 || isNaN(newLengthParsed) || newLengthParsed <= 0) return
    
    const newLengthPixels = newLengthParsed * PIXELS_PER_INCH
    const dx = v2.x - v1.x
    const dy = v2.y - v1.y
    const currentLengthPixels = Math.sqrt(dx * dx + dy * dy)

    if (Math.abs(currentLengthPixels) < 0.001) return

    const newV2_x = v1.x + (dx / currentLengthPixels) * newLengthPixels
    const newV2_y = v1.y + (dy / currentLengthPixels) * newLengthPixels
    
    const updatedVertices = vertices.map(v => 
      v.id === v2.id ? { ...v, x: snapToGrid(newV2_x), y: snapToGrid(newV2_y) } : v
    );
    setVertices(updatedVertices)
    setErrorMessage(null)
  }

  const handleDeleteSegment = () => {
    if (!selectedSegmentId) return
    
    // Remove the segment
    const updatedSegments = segments.filter(s => s.id !== selectedSegmentId)
    setSegments(updatedSegments)
    
    // Remove any doors on this segment
    const updatedDoors = doors.filter(d => d.segmentId !== selectedSegmentId)
    setDoors(updatedDoors)
    
    setSelectedSegmentId(null)
    setErrorMessage(null)
  }

  const handleToggleLock = () => {
    if (!selectedSegmentId) return
    setSegments(
      segments.map((s) =>
        s.id === selectedSegmentId ? { ...s, isLocked: !s.isLocked } : s,
      ),
    )
    const segment = getSegmentById(selectedSegmentId);
    if (segment && !segment.isLocked) setErrorMessage(null); // Clear error if unlocking
  }

  const isShapeClosed = () => { // Basic check, needs improvement
    if (vertices.length < 3) return false;
    // A true check would see if the last vertex can form a 90-degree angle
    // with the first vertex and the segment before the last vertex.
    return true; 
  }

  const handleFinishDrawing = () => {
    setPreviewLine(null); // Clear preview line
    // Here you might add logic to auto-close the shape if desired and possible
    if (vertices.length > 2) {
        const firstVertex = vertices[0];
        const lastVertex = vertices[vertices.length -1];
        const penultimateVertex = vertices[vertices.length -2];

        // Try to form the last segment to close the shape at 90 degrees
        let closingPointX = firstVertex.x;
        let closingPointY = firstVertex.y;
        let needsTwoSegments = false;

        const lastSegmentWasHorizontal = Math.abs(lastVertex.y - penultimateVertex.y) < 0.1;

        if (lastSegmentWasHorizontal) { // Last drawn was horizontal, next must be vertical
            if (Math.abs(lastVertex.x - firstVertex.x) < GRID_SIZE_PIXELS / 2) { // Align X with first vertex
                closingPointX = lastVertex.x; // Y is already firstVertex.y
            } else { // Needs an intermediate segment
                needsTwoSegments = true;
                closingPointX = lastVertex.x; // First closing segment is vertical
                                            // Second closing segment will be horizontal to firstVertex.x
            }
        } else { // Last drawn was vertical, next must be horizontal
             if (Math.abs(lastVertex.y - firstVertex.y) < GRID_SIZE_PIXELS / 2) { // Align Y with first vertex
                closingPointY = lastVertex.y; // X is already firstVertex.x
            } else {
                needsTwoSegments = true;
                closingPointY = lastVertex.y; // First closing segment is horizontal
            }
        }
        
        let finalVertices = [...vertices];
        let finalSegments = [...segments];

        if (needsTwoSegments) {
            const intermediateVertex: CanvasVertex = {id: uuidv4(), x: closingPointX, y: closingPointY};
            finalVertices.push(intermediateVertex);
            finalSegments.push({id: uuidv4(), v1_id: lastVertex.id, v2_id: intermediateVertex.id, isLocked: false});
            // Now connect intermediate to first
            finalSegments.push({id: uuidv4(), v1_id: intermediateVertex.id, v2_id: firstVertex.id, isLocked: false});
        } else {
            // Check if lastVertex is already at firstVertex position (or very close)
            if (Math.abs(lastVertex.x - firstVertex.x) > 0.1 || Math.abs(lastVertex.y - firstVertex.y) > 0.1) {
                 finalSegments.push({id: uuidv4(), v1_id: lastVertex.id, v2_id: firstVertex.id, isLocked: false});
            } else {
                // Last point is already the first point, potentially remove last vertex if it's a duplicate
                // and adjust last segment to point to first vertex.
                if (segments.length > 0) {
                    const lastSeg = finalSegments[finalSegments.length -1];
                    if (lastSeg.v2_id === lastVertex.id) {
                        lastSeg.v2_id = firstVertex.id;
                        finalVertices.pop(); // Remove duplicate last vertex
                    }
                }
            }
        }
        setVertices(finalVertices);
        setSegments(finalSegments);
        setErrorMessage("Shape closed. Review and save.");
    } else {
        setErrorMessage("Not enough points to form a shape.");
    }
  }

  const handleCreateOrSave = () => {
    if (!roomName.trim()) {
      setErrorMessage("Room name is required.")
      return
    }
    if (vertices.length < 3 || segments.length < 2) { // Need at least 3 vertices for a triangle, 2 segments
      setErrorMessage("Room must have at least 3 walls forming a closed shape.")
      return
    }
    // Add more robust validation for actual closure and 90-degree angles throughout
    if (!isShapeClosed()) { // Placeholder
         setErrorMessage("Room must be a closed shape with all walls connected properly at 90-degree angles.")
         return
    }

    const roomData: RoomShape = {
      id: initialRoom?.id || uuidv4(),
      name: roomName,
      vertices,
      segments,
      doors,
    }
    onSave(roomData)
    onClose()
  }

  const selectedSegmentObj = selectedSegmentId ? getSegmentById(selectedSegmentId) : null;
  const selectedDoorObj = selectedDoorId ? getDoorById(selectedDoorId) : null;

  const handleZoom = (factor: number) => {
    const newZoomLevel = Math.max(0.1, Math.min(zoomLevel * factor, 5)); // Clamp zoom
    // Zoom towards center of canvas view
    const centerX = viewBoxX + (CANVAS_WIDTH / zoomLevel) / 2;
    const centerY = viewBoxY + (CANVAS_HEIGHT / zoomLevel) / 2;

    setViewBoxX(centerX - (CANVAS_WIDTH / newZoomLevel) / 2);
    setViewBoxY(centerY - (CANVAS_HEIGHT / newZoomLevel) / 2);
    setZoomLevel(newZoomLevel);
  };

  const rotateShape = (clockwise: boolean) => {
    if (vertices.length === 0) return;

    // Calculate center of the shape
    const minX = Math.min(...vertices.map(v => v.x));
    const maxX = Math.max(...vertices.map(v => v.x));
    const minY = Math.min(...vertices.map(v => v.y));
    const maxY = Math.max(...vertices.map(v => v.y));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Rotate all vertices around the center
    const rotatedVertices = vertices.map(vertex => {
      // Translate to origin
      const translatedX = vertex.x - centerX;
      const translatedY = vertex.y - centerY;
      
      // Apply rotation
      let newX, newY;
      if (clockwise) {
        // 90 degrees clockwise: (x, y) -> (-y, x)
        newX = -translatedY;
        newY = translatedX;
      } else {
        // 90 degrees counterclockwise: (x, y) -> (y, -x)
        newX = translatedY;
        newY = -translatedX;
      }
      
      // Translate back and snap to grid
      return {
        ...vertex,
        x: snapToGrid(newX + centerX),
        y: snapToGrid(newY + centerY)
      };
    });

    setVertices(rotatedVertices);
    setSelectedSegmentId(null); // Clear selection after rotation
    setErrorMessage(null);
  };

  // Add door-specific functions
  const findNearestSegment = (point: { x: number; y: number }): { segment: CanvasSegment; position: number } | null => {
    let nearestSegment: CanvasSegment | null = null
    let nearestDistance = Infinity
    let nearestPosition = 0

    for (const segment of segments) {
      const v1 = getVertexById(segment.v1_id)
      const v2 = getVertexById(segment.v2_id)
      if (!v1 || !v2) continue

      // Calculate distance from point to line segment
      const A = point.x - v1.x
      const B = point.y - v1.y
      const C = v2.x - v1.x
      const D = v2.y - v1.y

      const dot = A * C + B * D
      const lenSq = C * C + D * D
      const param = lenSq !== 0 ? dot / lenSq : -1

      let xx, yy

      if (param < 0) {
        xx = v1.x
        yy = v1.y
      } else if (param > 1) {
        xx = v2.x
        yy = v2.y
      } else {
        xx = v1.x + param * C
        yy = v1.y + param * D
      }

      const dx = point.x - xx
      const dy = point.y - yy
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < nearestDistance && distance < 20) { // 20 pixel threshold
        nearestDistance = distance
        nearestSegment = segment
        nearestPosition = Math.max(0, Math.min(1, param))
      }
    }

    return nearestSegment ? { segment: nearestSegment, position: nearestPosition } : null
  }

  const handleDoorPlacement = (point: { x: number; y: number }) => {
    const nearest = findNearestSegment(point)
    if (!nearest) {
      setErrorMessage("Doors can only be placed on existing walls.")
      return
    }

    const newDoor: Door = {
      id: uuidv4(),
      segmentId: nearest.segment.id,
      position: nearest.position,
      size: 32, // Default size
      direction: "in",
      hingeSide: "left",
    }

    setDoors([...doors, newDoor])
    setSelectedDoorId(newDoor.id)
    setDrawingMode("draw") // Return to draw mode after placing
    setPreviewDoor(null)
    setErrorMessage(null)
  }

  const updateDoorProperty = <K extends keyof Door>(doorId: string, property: K, value: Door[K]) => {
    setDoors(doors.map(door => 
      door.id === doorId ? { ...door, [property]: value } : door
    ))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); }}}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{initialRoom ? "Edit Room" : "Create Room"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow flex flex-col gap-0 overflow-hidden">
          {/* Room Name Input */}
          <div className="p-4 border-b bg-slate-50/50">
            <div>
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Living Room, Bedroom..."
              />
            </div>
          </div>

          {/* Pan/Zoom/Door Controls */}
          <div className="p-2 border-b flex items-center gap-2 bg-slate-50">
            <Button 
              variant={drawingMode === 'draw' ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setDrawingMode('draw')}
              title="Draw walls and shapes"
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button 
              variant={drawingMode === 'door' ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setDrawingMode('door')}
              title="Place doors on walls"
            >
              <DoorOpen className="h-4 w-4" />
            </Button>
            <div className="h-4 border-l border-gray-300 mx-1"></div>
            <Button variant="ghost" size="sm" onClick={() => handleZoom(1.25)}><ZoomIn className="h-4 w-4"/></Button>
            <Button variant="ghost" size="sm" onClick={() => handleZoom(0.8)}><ZoomOut className="h-4 w-4"/></Button>
            <div className="h-4 border-l border-gray-300 mx-1"></div>
            <Button variant="ghost" size="sm" onClick={() => rotateShape(false)} disabled={vertices.length === 0}><RotateCcw className="h-4 w-4"/></Button>
            <Button variant="ghost" size="sm" onClick={() => rotateShape(true)} disabled={vertices.length === 0}><RotateCw className="h-4 w-4"/></Button>
          </div>

          {/* Canvas */}
          <div 
            className="flex-grow relative"
            onMouseUp={handleMouseUpOnCanvas}
            onMouseLeave={handleMouseUpOnCanvas}
          >
            <div className="absolute inset-0">
              <ShapeEditorCanvas
                vertices={vertices}
                segments={segments}
                doors={doors}
                selectedSegmentId={selectedSegmentId}
                selectedDoorId={selectedDoorId}
                onCanvasClick={handleCanvasInteraction}
                onSegmentClick={handleSegmentSelect}
                onDoorClick={(doorId) => {
                  setSelectedDoorId(doorId);
                  setSelectedSegmentId(null); // Clear segment selection when selecting a door
                }}
                onMouseMove={handleCanvasMouseMove}
                previewLine={previewLine}
                previewLineLength={previewLineLength}
                previewDoor={previewDoor}
                pixelsPerInch={PIXELS_PER_INCH}
                gridSizePixels={GRID_SIZE_PIXELS}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                viewBoxX={viewBoxX}
                viewBoxY={viewBoxY}
                zoomLevel={zoomLevel}
              />
            </div>
          </div>

          {/* Controls Below Canvas */}
          <div className="border-t p-4 bg-slate-50/50 space-y-4">
            {selectedSegmentObj && (
              <div className="border p-3 rounded-md space-y-3 bg-white shadow-sm">
                <h4 className="font-semibold text-sm">Selected Wall</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="wallLength">Wall Length (inches)</Label>
                    <Input
                      id="wallLength"
                      type="number"
                      value={editableLengthInches}
                      onChange={(e) => handleLengthChange(e.target.value)}
                      placeholder="e.g., 120"
                      disabled={selectedSegmentObj.isLocked}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Current length: {editableLengthInches ? `${editableLengthInches} inches` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="lockWall">Lock</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleLock}
                      className="w-full"
                    >
                      {selectedSegmentObj.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="deleteWall">Delete</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSegment}
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedDoorObj && (
              <div className="border p-3 rounded-md space-y-3 bg-blue-50 shadow-sm">
                <h4 className="font-semibold text-sm">Selected Door</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="doorSize">Door Size</Label>
                    <Select value={selectedDoorObj.size.toString()} onValueChange={(value) => updateDoorProperty(selectedDoorObj.id, "size", parseInt(value) as DoorSize)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="32">32 inches</SelectItem>
                        <SelectItem value="36">36 inches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doorDirection">Opening Direction</Label>
                    <Select value={selectedDoorObj.direction} onValueChange={(value) => updateDoorProperty(selectedDoorObj.id, "direction", value as DoorDirection)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Inward</SelectItem>
                        <SelectItem value="out">Outward</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hingeSide">Hinge</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updateDoorProperty(selectedDoorObj.id, "hingeSide", selectedDoorObj.hingeSide === "left" ? "right" : "left")}
                      className="w-full"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="removeDoor">Remove</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDoors(doors.filter(d => d.id !== selectedDoorObj.id))}
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {previewLine && vertices.length > 0 && (
                  <Button variant="outline" onClick={handleFinishDrawing}>
                      Finish & Close Shape
                  </Button>
              )}
               {vertices.length > 0 && !previewLine && (
                  <Button variant="outline" onClick={() => { setVertices([]); setSegments([]); setSelectedSegmentId(null); setPreviewLine(null); setPreviewLineLength(null); setErrorMessage(null); }}>
                      Clear Drawing
                  </Button>
              )}
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600 p-2 bg-red-50 rounded-md">{errorMessage}</p>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 mt-auto border-t">
          <DialogClose asChild>
            <Button variant="outline" onClick={() => { onClose();}}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreateOrSave}>
            {initialRoom ? "Save Changes" : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RoomEditor