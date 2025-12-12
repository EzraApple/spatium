import { useState, useEffect, useCallback, useRef } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PropertySheet } from "./property-sheet"
import type { DoorEntity, HingeSide } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor, inchesToEighths } from "@apartment-planner/shared"
import { DOOR_WIDTH_PRESETS } from "./lib/constants"

type DoorPropertiesProps = {
  door: DoorEntity
  onUpdate: (door: DoorEntity) => void
  onDelete: (doorId: string) => void
}

export function DoorProperties({ door, onUpdate, onDelete }: DoorPropertiesProps) {
  const [name, setName] = useState("")
  const [doorWidth, setDoorWidth] = useState("")
  const [hingeSide, setHingeSide] = useState<HingeSide>("left")
  const focusedIdRef = useRef<string | null>(null)

  useEffect(() => {
    setName(door.name)
    setDoorWidth(formatInchesForEditor(door.width))
    setHingeSide(door.hingeSide)
  }, [door])

  const handleFocusCapture = useCallback(() => {
    focusedIdRef.current = door.id
  }, [door.id])

  const handleSave = useCallback(() => {
    if (focusedIdRef.current !== null && focusedIdRef.current !== door.id) return
    onUpdate({
      ...door,
      name,
      width: parseInchesFromEditor(doorWidth) ?? door.width,
      hingeSide,
    })
  }, [door, name, doorWidth, hingeSide, onUpdate])

  const handleWidthPreset = useCallback((widthInches: number) => {
    setDoorWidth(String(widthInches))
    onUpdate({
      ...door,
      width: inchesToEighths(widthInches),
    })
  }, [door, onUpdate])

  const handleHingeSideChange = useCallback((side: HingeSide) => {
    setHingeSide(side)
    onUpdate({
      ...door,
      hingeSide: side,
    })
  }, [door, onUpdate])

  const handleBlur = () => handleSave()

  return (
    <PropertySheet
      title="Door"
      footer={
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(door.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Door
        </Button>
      }
    >
      <div onFocusCapture={handleFocusCapture} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prop-name">Name</Label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prop-door-width">Width (in)</Label>
          <div className="mb-2 flex gap-1">
            {DOOR_WIDTH_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={parseFloat(doorWidth) === preset.value ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleWidthPreset(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Input
            id="prop-door-width"
            value={doorWidth}
            onChange={(e) => setDoorWidth(e.target.value)}
            onBlur={handleBlur}
            placeholder="Custom width"
          />
        </div>

        <div className="space-y-2">
          <Label>Hinge Side</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["left", "right"] as HingeSide[]).map((side) => (
              <Button
                key={side}
                type="button"
                variant={hingeSide === side ? "default" : "outline"}
                size="sm"
                onClick={() => handleHingeSideChange(side)}
              >
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </PropertySheet>
  )
}

