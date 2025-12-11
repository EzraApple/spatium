import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

  useEffect(() => {
    setName(door.name)
    setDoorWidth(formatInchesForEditor(door.width))
    setHingeSide(door.hingeSide)
  }, [door])

  const handleSave = useCallback(() => {
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
    <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-sidebar-border bg-sidebar shadow-lg animate-in slide-in-from-right-4 duration-200 cursor-hidden flex flex-col">
      <div className="p-4 pb-0">
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">Door</h3>
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

        <div className="space-y-2">
          <Label htmlFor="prop-door-width">Width (in)</Label>
          <div className="flex gap-1 mb-2">
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

        <Separator className="my-4" />

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(door.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Door
        </Button>
      </div>
    </div>
  )
}

