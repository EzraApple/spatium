import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor, inchesToEighths } from "@apartment-planner/shared"
import {
  RectangleRoomIcon,
  LShapedRoomIcon,
  BeveledRoomIcon,
} from "@/components/room-shape-icons"

type ShapeType = "rectangle" | "l-shaped" | "beveled"

const SHAPE_OPTIONS: { type: ShapeType; label: string; icon: typeof RectangleRoomIcon }[] = [
  { type: "rectangle", label: "Rectangle", icon: RectangleRoomIcon },
  { type: "l-shaped", label: "L-Shaped", icon: LShapedRoomIcon },
  { type: "beveled", label: "Beveled", icon: BeveledRoomIcon },
]

const DEFAULT_WIDTH = inchesToEighths(120)
const DEFAULT_HEIGHT = inchesToEighths(96)
const DEFAULT_CUT = inchesToEighths(36)
const DEFAULT_BEVEL = inchesToEighths(24)

type AddRoomModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, template: ShapeTemplate) => void
}

export function AddRoomModal({ open, onOpenChange, onAdd }: AddRoomModalProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>("rectangle")
  const [name, setName] = useState("New Room")
  const [width, setWidth] = useState(formatInchesForEditor(DEFAULT_WIDTH))
  const [height, setHeight] = useState(formatInchesForEditor(DEFAULT_HEIGHT))
  const [cutWidth, setCutWidth] = useState(formatInchesForEditor(DEFAULT_CUT))
  const [cutHeight, setCutHeight] = useState(formatInchesForEditor(DEFAULT_CUT))
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")
  const [bevelSize, setBevelSize] = useState(formatInchesForEditor(DEFAULT_BEVEL))
  const [bevelCorner, setBevelCorner] = useState<Corner>("top-right")

  const resetForm = () => {
    setSelectedShape("rectangle")
    setName("New Room")
    setWidth(formatInchesForEditor(DEFAULT_WIDTH))
    setHeight(formatInchesForEditor(DEFAULT_HEIGHT))
    setCutWidth(formatInchesForEditor(DEFAULT_CUT))
    setCutHeight(formatInchesForEditor(DEFAULT_CUT))
    setCutCorner("top-right")
    setBevelSize(formatInchesForEditor(DEFAULT_BEVEL))
    setBevelCorner("top-right")
  }

  const handleAdd = () => {
    const widthEighths = parseInchesFromEditor(width) ?? DEFAULT_WIDTH
    const heightEighths = parseInchesFromEditor(height) ?? DEFAULT_HEIGHT

    let template: ShapeTemplate

    switch (selectedShape) {
      case "rectangle":
        template = { type: "rectangle", width: widthEighths, height: heightEighths }
        break
      case "l-shaped":
        template = {
          type: "l-shaped",
          width: widthEighths,
          height: heightEighths,
          cutWidth: parseInchesFromEditor(cutWidth) ?? DEFAULT_CUT,
          cutHeight: parseInchesFromEditor(cutHeight) ?? DEFAULT_CUT,
          cutCorner,
        }
        break
      case "beveled":
        template = {
          type: "beveled",
          width: widthEighths,
          height: heightEighths,
          bevelSize: parseInchesFromEditor(bevelSize) ?? DEFAULT_BEVEL,
          bevelCorner,
        }
        break
    }

    onAdd(name, template)
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Room</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Living Room"
            />
          </div>

          <div className="space-y-2">
            <Label>Shape</Label>
            <div className="grid grid-cols-3 gap-3">
              {SHAPE_OPTIONS.map(({ type, label, icon: Icon }) => (
                <Card
                  key={type}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedShape === type && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedShape(type)}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-4">
                    <Icon className="size-8 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (in)</Label>
                <Input
                  id="width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="120"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (in)</Label>
                <Input
                  id="height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="96"
                />
              </div>
            </div>

            {selectedShape === "l-shaped" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cut-width">Cut Width (in)</Label>
                    <Input
                      id="cut-width"
                      value={cutWidth}
                      onChange={(e) => setCutWidth(e.target.value)}
                      placeholder="36"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cut-height">Cut Height (in)</Label>
                    <Input
                      id="cut-height"
                      value={cutHeight}
                      onChange={(e) => setCutHeight(e.target.value)}
                      placeholder="36"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cut Corner</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                      (corner) => (
                        <Button
                          key={corner}
                          type="button"
                          variant={cutCorner === corner ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCutCorner(corner)}
                        >
                          {corner.replace("-", " ")}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}

            {selectedShape === "beveled" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bevel-size">Bevel Size (in)</Label>
                  <Input
                    id="bevel-size"
                    value={bevelSize}
                    onChange={(e) => setBevelSize(e.target.value)}
                    placeholder="24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bevel Corner</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                      (corner) => (
                        <Button
                          key={corner}
                          type="button"
                          variant={bevelCorner === corner ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBevelCorner(corner)}
                        >
                          {corner.replace("-", " ")}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Room</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

