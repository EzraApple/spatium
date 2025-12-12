import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PropertySheet } from "./property-sheet"
import type { FurnitureEntity, FurnitureShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor, inchesToEighths } from "@apartment-planner/shared"
import { DEFAULT_FURNITURE_COLORS } from "./lib/constants"

const BED_SIZE_PRESETS = [
  { value: "twin", label: 'Twin (38" × 75")', widthIn: 38, heightIn: 75 },
  { value: "twin-xl", label: 'Twin XL (38" × 80")', widthIn: 38, heightIn: 80 },
  { value: "full", label: 'Full (54" × 75")', widthIn: 54, heightIn: 75 },
  { value: "queen", label: 'Queen (60" × 80")', widthIn: 60, heightIn: 80 },
  { value: "king", label: 'King (76" × 80")', widthIn: 76, heightIn: 80 },
  { value: "cal-king", label: 'Cal King (72" × 84")', widthIn: 72, heightIn: 84 },
] as const

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
  "bed": "Bed",
}

export function FurnitureProperties({ furniture, onUpdate, onDelete }: FurniturePropertiesProps) {
  const [name, setName] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [radius, setRadius] = useState("")
  const [furnitureColor, setFurnitureColor] = useState("#4A4A4A")
  const [bedPreset, setBedPreset] = useState<(typeof BED_SIZE_PRESETS)[number]["value"] | "custom">("custom")
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
      if (furniture.furnitureType === "bed") {
        const widthIn = furniture.shapeTemplate.width / 8
        const heightIn = furniture.shapeTemplate.height / 8
        const preset = BED_SIZE_PRESETS.find((p) => p.widthIn === widthIn && p.heightIn === heightIn)
        setBedPreset(preset?.value ?? "custom")
      } else {
        setBedPreset("custom")
      }
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

  const handleBedPresetChange = useCallback((value: (typeof BED_SIZE_PRESETS)[number]["value"] | "custom") => {
    setBedPreset(value)
    if (value === "custom") return
    const preset = BED_SIZE_PRESETS.find((p) => p.value === value)
    if (!preset) return
    setWidth(String(preset.widthIn))
    setHeight(String(preset.heightIn))
    onUpdate({
      ...furniture,
      shapeTemplate: {
        type: "rectangle",
        width: inchesToEighths(preset.widthIn),
        height: inchesToEighths(preset.heightIn),
      },
    })
  }, [furniture, onUpdate])

  const handleBedRotate = useCallback(() => {
    if (furniture.shapeTemplate.type !== "rectangle") return

    const widthIn = parseInchesFromEditor(width) ?? furniture.shapeTemplate.width
    const heightIn = parseInchesFromEditor(height) ?? furniture.shapeTemplate.height

    const nextWidth = heightIn
    const nextHeight = widthIn

    setWidth(formatInchesForEditor(nextWidth))
    setHeight(formatInchesForEditor(nextHeight))

    const nextWidthDisplay = nextWidth / 8
    const nextHeightDisplay = nextHeight / 8
    const preset = BED_SIZE_PRESETS.find((p) => p.widthIn === nextWidthDisplay && p.heightIn === nextHeightDisplay)
    setBedPreset(preset?.value ?? "custom")

    const currentRotation = furniture.rotation ?? 0
    const nextRotation = ((currentRotation + 90) % 360) as 0 | 90 | 180 | 270

    onUpdate({
      ...furniture,
      rotation: nextRotation,
      shapeTemplate: {
        type: "rectangle",
        width: nextWidth,
        height: nextHeight,
      },
    })
  }, [furniture, width, height, onUpdate])

  const handleBlur = () => handleSave()

  const shapeType = furniture.shapeTemplate.type
  const furnitureTypeLabel = FURNITURE_TYPE_LABELS[furniture.furnitureType]

  return (
    <PropertySheet title="Furniture" subtitle={furnitureTypeLabel}>
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
        <>
          {furniture.furnitureType === "bed" && (
            <>
              <div className="space-y-2">
                <Label>Bed size</Label>
                <Select
                  value={bedPreset}
                  onValueChange={(value) =>
                    handleBedPresetChange(value as (typeof BED_SIZE_PRESETS)[number]["value"] | "custom")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Custom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    {BED_SIZE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleBedRotate}>
                Rotate 90°
              </Button>
            </>
          )}
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
        </>
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
    </PropertySheet>
  )
}

