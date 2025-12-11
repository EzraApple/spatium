import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { FurnitureEntity, FurnitureShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor } from "@apartment-planner/shared"
import { DEFAULT_FURNITURE_COLORS } from "./lib/constants"

type FurniturePropertiesProps = {
  furniture: FurnitureEntity
  onUpdate: (furniture: FurnitureEntity) => void
  onDelete: (furnitureId: string) => void
}

const FURNITURE_TYPE_LABELS: Record<FurnitureEntity["furnitureType"], string> = {
  "square-table": "Square Table",
  "circle-table": "Circle Table",
  "rectangle-desk": "Rectangle Desk",
  "l-shaped-desk": "L-Shaped Desk",
  "couch": "Couch",
  "l-shaped-couch": "L-Shaped Couch",
  "fridge": "Fridge",
}

export function FurnitureProperties({ furniture, onUpdate, onDelete }: FurniturePropertiesProps) {
  const [name, setName] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [radius, setRadius] = useState("")
  const [furnitureColor, setFurnitureColor] = useState("#4A4A4A")
  const [lLength, setLLength] = useState("")
  const [lWidth, setLWidth] = useState("")
  const [lDepth, setLDepth] = useState("")
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")

  useEffect(() => {
    setName(furniture.name)
    setFurnitureColor(furniture.color ?? DEFAULT_FURNITURE_COLORS[furniture.furnitureType])
    
    if (furniture.shapeTemplate.type === "circle") {
      setRadius(formatInchesForEditor(furniture.shapeTemplate.radius))
    } else if (furniture.shapeTemplate.type === "l-shaped") {
      const template = furniture.shapeTemplate
      setLLength(formatInchesForEditor(template.width))
      setLWidth(formatInchesForEditor(template.height))
      const depth = template.width - template.cutWidth
      setLDepth(formatInchesForEditor(depth))
      setCutCorner(template.cutCorner)
    } else {
      setWidth(formatInchesForEditor(furniture.shapeTemplate.width))
      setHeight(formatInchesForEditor(furniture.shapeTemplate.height))
    }
  }, [furniture])

  const handleSave = useCallback((overrides?: { cutCorner?: Corner }) => {
    let template: FurnitureShapeTemplate

    if (furniture.shapeTemplate.type === "circle") {
      template = {
        type: "circle",
        radius: parseInchesFromEditor(radius) ?? furniture.shapeTemplate.radius,
      }
    } else if (furniture.shapeTemplate.type === "l-shaped") {
      const length = parseInchesFromEditor(lLength) ?? furniture.shapeTemplate.width
      const lw = parseInchesFromEditor(lWidth) ?? furniture.shapeTemplate.height
      const depth = parseInchesFromEditor(lDepth) ?? (furniture.shapeTemplate.width - furniture.shapeTemplate.cutWidth)
      template = {
        type: "l-shaped",
        width: length,
        height: lw,
        cutWidth: length - depth,
        cutHeight: lw - depth,
        cutCorner: overrides?.cutCorner ?? cutCorner,
      }
    } else {
      template = {
        type: "rectangle",
        width: parseInchesFromEditor(width) ?? furniture.shapeTemplate.width,
        height: parseInchesFromEditor(height) ?? furniture.shapeTemplate.height,
      }
    }

    onUpdate({
      ...furniture,
      name,
      shapeTemplate: template,
      color: furnitureColor,
    })
  }, [furniture, name, width, height, lLength, lWidth, lDepth, cutCorner, radius, furnitureColor, onUpdate])

  const handleColorChange = useCallback((newColor: string) => {
    setFurnitureColor(newColor)
    onUpdate({
      ...furniture,
      color: newColor,
    })
  }, [furniture, onUpdate])

  const handleBlur = () => handleSave()

  const shapeType = furniture.shapeTemplate.type
  const furnitureTypeLabel = FURNITURE_TYPE_LABELS[furniture.furnitureType]

  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-sidebar-border bg-sidebar shadow-lg animate-in slide-in-from-right-4 duration-200 cursor-hidden flex flex-col">
      <div className="p-4 pb-0">
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">Furniture</h3>
        <p className="text-xs text-muted-foreground">{furnitureTypeLabel}</p>
      </div>

      <Separator className="my-4" />

      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prop-name">Name</Label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        {shapeType === "circle" && (
          <div className="space-y-2">
            <Label htmlFor="prop-radius">Radius (in)</Label>
            <Input
              id="prop-radius"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        )}

        {shapeType === "rectangle" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="prop-width">Width (in)</Label>
              <Input
                id="prop-width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-height">Height (in)</Label>
              <Input
                id="prop-height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
          </div>
        )}

        {shapeType === "l-shaped" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="prop-l-length">Length (in)</Label>
              <Input
                id="prop-l-length"
                value={lLength}
                onChange={(e) => setLLength(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-l-width">Width (in)</Label>
              <Input
                id="prop-l-width"
                value={lWidth}
                onChange={(e) => setLWidth(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-l-depth">Depth (in)</Label>
              <Input
                id="prop-l-depth"
                value={lDepth}
                onChange={(e) => setLDepth(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  const rotateMap: Record<Corner, Corner> = {
                    "top-right": "bottom-right",
                    "bottom-right": "bottom-left",
                    "bottom-left": "top-left",
                    "top-left": "top-right",
                  }
                  const newCorner = rotateMap[cutCorner]
                  setCutCorner(newCorner)
                  handleSave({ cutCorner: newCorner })
                }}
              >
                ↻ 90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  const rotateMap: Record<Corner, Corner> = {
                    "top-right": "top-left",
                    "top-left": "bottom-left",
                    "bottom-left": "bottom-right",
                    "bottom-right": "top-right",
                  }
                  const newCorner = rotateMap[cutCorner]
                  setCutCorner(newCorner)
                  handleSave({ cutCorner: newCorner })
                }}
              >
                ↺ 90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  const flipMap: Record<Corner, Corner> = {
                    "top-left": "top-right",
                    "top-right": "top-left",
                    "bottom-left": "bottom-right",
                    "bottom-right": "bottom-left",
                  }
                  const newCorner = flipMap[cutCorner]
                  setCutCorner(newCorner)
                  handleSave({ cutCorner: newCorner })
                }}
              >
                ⇆ Flip
              </Button>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-col gap-2">
            <HexColorPicker
              color={furnitureColor}
              onChange={handleColorChange}
              style={{ width: "100%", height: 150 }}
            />
            <Input
              value={furnitureColor}
              onChange={(e) => handleColorChange(e.target.value)}
              placeholder="#4A4A4A"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(furniture.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Furniture
        </Button>
      </div>
    </div>
  )
}

