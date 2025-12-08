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
import { formatEighths, parseToEighths, feetToEighths } from "@apartment-planner/shared"
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

const DEFAULT_WIDTH = feetToEighths(10)
const DEFAULT_HEIGHT = feetToEighths(8)
const DEFAULT_CUT = feetToEighths(3)
const DEFAULT_BEVEL = feetToEighths(2)

type AddRoomModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, template: ShapeTemplate) => void
}

export function AddRoomModal({ open, onOpenChange, onAdd }: AddRoomModalProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>("rectangle")
  const [name, setName] = useState("New Room")
  const [width, setWidth] = useState(formatEighths(DEFAULT_WIDTH))
  const [height, setHeight] = useState(formatEighths(DEFAULT_HEIGHT))
  const [cutWidth, setCutWidth] = useState(formatEighths(DEFAULT_CUT))
  const [cutHeight, setCutHeight] = useState(formatEighths(DEFAULT_CUT))
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")
  const [bevelSize, setBevelSize] = useState(formatEighths(DEFAULT_BEVEL))
  const [bevelCorner, setBevelCorner] = useState<Corner>("top-right")

  const resetForm = () => {
    setSelectedShape("rectangle")
    setName("New Room")
    setWidth(formatEighths(DEFAULT_WIDTH))
    setHeight(formatEighths(DEFAULT_HEIGHT))
    setCutWidth(formatEighths(DEFAULT_CUT))
    setCutHeight(formatEighths(DEFAULT_CUT))
    setCutCorner("top-right")
    setBevelSize(formatEighths(DEFAULT_BEVEL))
    setBevelCorner("top-right")
  }

  const handleAdd = () => {
    const widthEighths = parseToEighths(width) ?? DEFAULT_WIDTH
    const heightEighths = parseToEighths(height) ?? DEFAULT_HEIGHT

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
          cutWidth: parseToEighths(cutWidth) ?? DEFAULT_CUT,
          cutHeight: parseToEighths(cutHeight) ?? DEFAULT_CUT,
          cutCorner,
        }
        break
      case "beveled":
        template = {
          type: "beveled",
          width: widthEighths,
          height: heightEighths,
          bevelSize: parseToEighths(bevelSize) ?? DEFAULT_BEVEL,
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
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="10'"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="8'"
                />
              </div>
            </div>

            {selectedShape === "l-shaped" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cut-width">Cut Width</Label>
                    <Input
                      id="cut-width"
                      value={cutWidth}
                      onChange={(e) => setCutWidth(e.target.value)}
                      placeholder="3'"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cut-height">Cut Height</Label>
                    <Input
                      id="cut-height"
                      value={cutHeight}
                      onChange={(e) => setCutHeight(e.target.value)}
                      placeholder="3'"
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
                  <Label htmlFor="bevel-size">Bevel Size</Label>
                  <Input
                    id="bevel-size"
                    value={bevelSize}
                    onChange={(e) => setBevelSize(e.target.value)}
                    placeholder="2'"
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

