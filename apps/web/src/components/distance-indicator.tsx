import type { Point } from "@apartment-planner/shared"
import { formatEighths } from "@apartment-planner/shared"

type DistanceIndicatorProps = {
  from: Point
  to: Point
  distanceInEighths: number
  scale: number
  pixelScale: number
}

const ARROW_SIZE = 6
const LABEL_OFFSET = 12

export function DistanceIndicator({
  from,
  to,
  distanceInEighths,
  scale,
  pixelScale,
}: DistanceIndicatorProps) {
  const scaledFrom = { x: from.x * scale, y: from.y * scale }
  const scaledTo = { x: to.x * scale, y: to.y * scale }

  const dx = scaledTo.x - scaledFrom.x
  const dy = scaledTo.y - scaledFrom.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length < 2 * pixelScale) return null

  const angle = Math.atan2(dy, dx)
  const perpAngle = angle + Math.PI / 2

  const arrowSize = ARROW_SIZE * pixelScale
  const strokeWidth = 1.5 * pixelScale

  const arrow1Points = [
    { x: scaledFrom.x, y: scaledFrom.y },
    {
      x: scaledFrom.x + Math.cos(angle - Math.PI / 6) * arrowSize,
      y: scaledFrom.y + Math.sin(angle - Math.PI / 6) * arrowSize,
    },
    {
      x: scaledFrom.x + Math.cos(angle + Math.PI / 6) * arrowSize,
      y: scaledFrom.y + Math.sin(angle + Math.PI / 6) * arrowSize,
    },
  ]

  const arrow2Points = [
    { x: scaledTo.x, y: scaledTo.y },
    {
      x: scaledTo.x + Math.cos(angle + Math.PI - Math.PI / 6) * arrowSize,
      y: scaledTo.y + Math.sin(angle + Math.PI - Math.PI / 6) * arrowSize,
    },
    {
      x: scaledTo.x + Math.cos(angle + Math.PI + Math.PI / 6) * arrowSize,
      y: scaledTo.y + Math.sin(angle + Math.PI + Math.PI / 6) * arrowSize,
    },
  ]

  const midX = (scaledFrom.x + scaledTo.x) / 2
  const midY = (scaledFrom.y + scaledTo.y) / 2

  const labelOffset = LABEL_OFFSET * pixelScale
  const labelX = midX + Math.cos(perpAngle) * labelOffset
  const labelY = midY + Math.sin(perpAngle) * labelOffset

  const formattedDistance = formatEighths(distanceInEighths)
  const fontSize = 11 * pixelScale

  return (
    <g className="distance-indicator" pointerEvents="none">
      <line
        x1={scaledFrom.x}
        y1={scaledFrom.y}
        x2={scaledTo.x}
        y2={scaledTo.y}
        stroke="hsl(262 83% 58%)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 * pixelScale} ${2 * pixelScale}`}
      />

      <polygon
        points={arrow1Points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="hsl(262 83% 58%)"
      />

      <polygon
        points={arrow2Points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="hsl(262 83% 58%)"
      />

      <rect
        x={labelX - (formattedDistance.length * fontSize * 0.35)}
        y={labelY - fontSize * 0.7}
        width={formattedDistance.length * fontSize * 0.7}
        height={fontSize * 1.4}
        fill="hsl(262 83% 58%)"
        rx={3 * pixelScale}
      />

      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {formattedDistance}
      </text>
    </g>
  )
}

