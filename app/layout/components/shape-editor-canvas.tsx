// components/shape-editor-canvas-svg.tsx
import React from "react"

export interface CanvasVertex {
  id: string
  x: number
  y: number
}

export interface CanvasSegment {
  id: string
  v1_id: string
  v2_id: string
  isLocked: boolean
}

// Import Door types from room-editor
import type { Door, HingeSide } from "./room-editor"

interface ShapeEditorCanvasProps {
  vertices: CanvasVertex[]
  segments: CanvasSegment[]
  doors: Door[]
  selectedSegmentId: string | null
  selectedDoorId: string | null
  onCanvasClick: (point: { x: number; y: number }, event: React.MouseEvent<SVGSVGElement>) => void
  onSegmentClick: (segmentId: string, event: React.MouseEvent<SVGLineElement>) => void
  onDoorClick: (doorId: string, event: React.MouseEvent<SVGLineElement>) => void
  onVertexClick?: (vertexId: string, event: React.MouseEvent<SVGCircleElement>) => void // Optional
  onMouseMove?: (point: { x: number; y: number }, event: React.MouseEvent<SVGSVGElement>) => void
  previewLine: { start: { x: number; y: number }; end: { x: number; y: number } } | null
  previewLineLength: number | null
  previewDoor: Door | null
  pixelsPerInch: number
  gridSizePixels: number
  width: number
  height: number
  viewBoxX: number // For panning
  viewBoxY: number // For panning
  zoomLevel: number // For zooming
}

const ShapeEditorCanvas: React.FC<ShapeEditorCanvasProps> = ({
  vertices,
  segments,
  doors,
  selectedSegmentId,
  selectedDoorId,
  onCanvasClick,
  onSegmentClick,
  onDoorClick,
  onVertexClick,
  onMouseMove,
  previewLine,
  previewLineLength,
  previewDoor,
  pixelsPerInch,
  gridSizePixels,
  width,
  height,
  viewBoxX,
  viewBoxY,
  zoomLevel,
}) => {
  const getVertexById = (id: string) => vertices.find((v) => v.id === id)
  const getSegmentById = (id: string) => segments.find((s) => s.id === id)

  const getDoorPosition = (door: Door) => {
    const segment = getSegmentById(door.segmentId)
    if (!segment) return null
    
    const v1 = getVertexById(segment.v1_id)
    const v2 = getVertexById(segment.v2_id)
    if (!v1 || !v2) return null

    const doorX = v1.x + (v2.x - v1.x) * door.position
    const doorY = v1.y + (v2.y - v1.y) * door.position
    
    // Calculate door line endpoints
    const doorLengthPixels = door.size * pixelsPerInch
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
    // The swing should be perpendicular to the wall segment
    const perpAngle = segmentAngle + Math.PI / 2
    
    // Determine swing direction based ONLY on door direction
    let swingAngle = perpAngle
    if (door.direction === "in") {
      swingAngle += Math.PI // Flip to opposite side for inward opening
    }
    
    // Calculate the end point of the 90-degree swing
    const swingEndX = hingeX + Math.cos(swingAngle) * doorLengthPixels
    const swingEndY = hingeY + Math.sin(swingAngle) * doorLengthPixels

    // For a 90-degree arc, we always want the shorter path, so large-arc-flag = 0
    // The sweep flag determines clockwise (1) or counterclockwise (0)
    // Calculate the cross product to determine sweep direction
    const doorVecX = openEndX - hingeX
    const doorVecY = openEndY - hingeY
    const swingVecX = swingEndX - hingeX
    const swingVecY = swingEndY - hingeY
    
    // Cross product determines the sweep direction
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

  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const { x, y } = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    onCanvasClick({ x, y }, event)
  }

  const handleSVGMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onMouseMove) return
    const svg = event.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const { x, y } = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    onMouseMove({ x, y }, event)
  }

  // Grid Lines
  const gridLines = []
  const numVerticalLines = Math.floor(width / gridSizePixels / zoomLevel) + 20 // Add buffer for panning
  const numHorizontalLines = Math.floor(height / gridSizePixels / zoomLevel) + 20
  const majorGridSpacing = 12 // Major grid lines every 12 inches

  for (let i = -10; i < numVerticalLines; i++) { // Start from negative for panning
    const xPos = Math.round(i * gridSizePixels)
    const isMajorLine = i % majorGridSpacing === 0
    gridLines.push(
      <line
        key={`v-${i}`}
        x1={xPos}
        y1={-gridSizePixels * 10} // Extend beyond typical view
        x2={xPos}
        y2={height / zoomLevel + gridSizePixels * 10}
        stroke={isMajorLine ? "#d1d5db" : "#f3f4f6"}
        strokeWidth={(isMajorLine ? 1 : 0.5) / zoomLevel}
      />,
    )
  }
  for (let j = -10; j < numHorizontalLines; j++) {
    const yPos = Math.round(j * gridSizePixels)
    const isMajorLine = j % majorGridSpacing === 0
    gridLines.push(
      <line
        key={`h-${j}`}
        x1={-gridSizePixels * 10}
        y1={yPos}
        x2={width / zoomLevel + gridSizePixels * 10}
        y2={yPos}
        stroke={isMajorLine ? "#d1d5db" : "#f3f4f6"}
        strokeWidth={(isMajorLine ? 1 : 0.5) / zoomLevel}
      />,
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${viewBoxX} ${viewBoxY} ${width / zoomLevel} ${height / zoomLevel}`}
      onClick={handleSVGClick}
      onMouseMove={onMouseMove ? handleSVGMouseMove : undefined}
      style={{ backgroundColor: "white", border: "1px solid #ccc", cursor: "crosshair" }}
    >
      <g id="grid">{gridLines}</g>

      <g id="segments">
        {segments.map((seg) => {
          const v1 = getVertexById(seg.v1_id)
          const v2 = getVertexById(seg.v2_id)
          if (!v1 || !v2) return null

          const lengthPixels = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2))
          const lengthInches = lengthPixels / pixelsPerInch
          const midPoint = {
            x: (v1.x + v2.x) / 2,
            y: (v1.y + v2.y) / 2,
          }
          const isHorizontal = Math.abs(v1.y - v2.y) < 0.1 // Tolerance

          // Calculate angle for text rotation if needed (more complex for non-horizontal/vertical)
          // For now, simple offset
          const textOffset = 8 / zoomLevel;
          const fontSize = 10 / zoomLevel;

          return (
            <g key={seg.id}>
              <line
                x1={v1.x}
                y1={v1.y}
                x2={v2.x}
                y2={v2.y}
                stroke={selectedSegmentId === seg.id ? "#007bff" : "#333"}
                strokeWidth={(selectedSegmentId === seg.id ? 3 : 2) / zoomLevel}
                onClick={(e) => { e.stopPropagation(); onSegmentClick(seg.id, e); }}
                style={{ cursor: "pointer" }}
              />
              <text
                x={midPoint.x - (isHorizontal ? (lengthInches.toFixed(0).length * fontSize * 0.3) : textOffset)}
                y={midPoint.y - (isHorizontal ? textOffset : -fontSize * 0.3)}
                fontSize={fontSize}
                fill="#555"
                dominantBaseline="middle"
                textAnchor={isHorizontal ? "middle" : "end"}
              >
                {`${lengthInches.toFixed(0)}"`}
              </text>
              {seg.isLocked && (
                <text
                  x={midPoint.x + (isHorizontal ? (lengthInches.toFixed(0).length * fontSize * 0.3 + 5/zoomLevel) : 5/zoomLevel)}
                  y={midPoint.y + (isHorizontal ? 0 : -fontSize * 0.3)}
                  fontSize={fontSize}
                  fill="#333"
                  dominantBaseline="middle"
                  textAnchor={isHorizontal ? "start" : "start"}
                >
                  🔒
                </text>
              )}
            </g>
          )
        })}
      </g>

      <g id="doors">
        {doors.map((door) => {
          const doorPos = getDoorPosition(door)
          if (!doorPos) return null

          const isSelected = selectedDoorId === door.id
          
          return (
            <g key={door.id}>
              {/* Door line */}
              <line
                x1={doorPos.doorStart.x}
                y1={doorPos.doorStart.y}
                x2={doorPos.doorEnd.x}
                y2={doorPos.doorEnd.y}
                stroke={isSelected ? "#007bff" : "#3b82f6"}
                strokeWidth={4 / zoomLevel}
                onClick={(e) => { e.stopPropagation(); onDoorClick(door.id, e); }}
                style={{ cursor: "pointer" }}
              />
              
              {/* Door opening arc */}
              <path
                d={`M ${doorPos.hingePoint.x} ${doorPos.hingePoint.y} L ${doorPos.openEnd.x} ${doorPos.openEnd.y} A ${doorPos.doorLength} ${doorPos.doorLength} 0 0 ${doorPos.sweepFlag} ${doorPos.swingEnd.x} ${doorPos.swingEnd.y} Z`}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth={1 / zoomLevel}
                strokeDasharray={`${2/zoomLevel} ${2/zoomLevel}`}
              />
            </g>
          )
        })}
      </g>

      {/* Preview door */}
      {previewDoor && (
        <g id="preview-door">
          {(() => {
            const doorPos = getDoorPosition(previewDoor)
            if (!doorPos) return null

            return (
              <>
                <line
                  x1={doorPos.doorStart.x}
                  y1={doorPos.doorStart.y}
                  x2={doorPos.doorEnd.x}
                  y2={doorPos.doorEnd.y}
                  stroke="#3b82f6"
                  strokeWidth={4 / zoomLevel}
                  strokeDasharray={`${4/zoomLevel} ${2/zoomLevel}`}
                />
                <path
                  d={`M ${doorPos.hingePoint.x} ${doorPos.hingePoint.y} L ${doorPos.openEnd.x} ${doorPos.openEnd.y} A ${doorPos.doorLength} ${doorPos.doorLength} 0 0 ${doorPos.sweepFlag} ${doorPos.swingEnd.x} ${doorPos.swingEnd.y} Z`}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="#3b82f6"
                  strokeWidth={1 / zoomLevel}
                  strokeDasharray={`${2/zoomLevel} ${2/zoomLevel}`}
                />
              </>
            )
          })()}
        </g>
      )}

      <g id="vertices">
        {vertices.map((vertex) => (
          <circle
            key={vertex.id}
            cx={vertex.x}
            cy={vertex.y}
            r={4 / zoomLevel}
            fill="#007bff"
            stroke="#fff"
            strokeWidth={1 / zoomLevel}
            onClick={(e) => {
              e.stopPropagation();
              onVertexClick?.(vertex.id, e);
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
      </g>

      {previewLine && (
        <g>
          <line
            x1={previewLine.start.x}
            y1={previewLine.start.y}
            x2={previewLine.end.x}
            y2={previewLine.end.y}
            stroke="#007bff"
            strokeWidth={2 / zoomLevel}
            strokeDasharray={`${4/zoomLevel} ${2/zoomLevel}`}
          />
          {previewLineLength !== null && (
            <text
              x={(previewLine.start.x + previewLine.end.x) / 2}
              y={(previewLine.start.y + previewLine.end.y) / 2 - 10 / zoomLevel}
              fontSize={12 / zoomLevel}
              fill="#007bff"
              dominantBaseline="middle"
              textAnchor="middle"
              style={{ 
                backgroundColor: 'white',
                padding: '2px',
                fontWeight: 'bold'
              }}
            >
              {`${previewLineLength.toFixed(0)}"`}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}

export default ShapeEditorCanvas