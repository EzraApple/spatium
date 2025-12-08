import { useState, useEffect } from "react"
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
import type { RoomEntity, ShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatEighths, parseToEighths, shapeToVertices } from "@apartment-planner/shared"

type EditRoomModalProps = {
  room: RoomEntity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (room: RoomEntity) => void
}

export function EditRoomModal({ room, open, onOpenChange, onSave }: EditRoomModalProps) {
  const [name, setName] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [cutWidth, setCutWidth] = useState("")
  const [cutHeight, setCutHeight] = useState("")
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")
  const [bevelSize, setBevelSize] = useState("")
  const [bevelCorner, setBevelCorner] = useState<Corner>("top-right")

  useEffect(() => {
    if (room) {
      setName(room.name)
      setWidth(formatEighths(room.shapeTemplate.width))
      setHeight(formatEighths(room.shapeTemplate.height))

      if (room.shapeTemplate.type === "l-shaped") {
        setCutWidth(formatEighths(room.shapeTemplate.cutWidth))
        setCutHeight(formatEighths(room.shapeTemplate.cutHeight))
        setCutCorner(room.shapeTemplate.cutCorner)
      }

      if (room.shapeTemplate.type === "beveled") {
        setBevelSize(formatEighths(room.shapeTemplate.bevelSize))
        setBevelCorner(room.shapeTemplate.bevelCorner)
      }
    }
  }, [room])

  const handleSave = () => {
    if (!room) return

    const widthEighths = parseToEighths(width) ?? room.shapeTemplate.width
    const heightEighths = parseToEighths(height) ?? room.shapeTemplate.height

    let template: ShapeTemplate

    switch (room.shapeTemplate.type) {
      case "rectangle":
        template = { type: "rectangle", width: widthEighths, height: heightEighths }
        break
      case "l-shaped":
        template = {
          type: "l-shaped",
          width: widthEighths,
          height: heightEighths,
          cutWidth: parseToEighths(cutWidth) ?? room.shapeTemplate.cutWidth,
          cutHeight: parseToEighths(cutHeight) ?? room.shapeTemplate.cutHeight,
          cutCorner,
        }
        break
      case "beveled":
        template = {
          type: "beveled",
          width: widthEighths,
          height: heightEighths,
          bevelSize: parseToEighths(bevelSize) ?? room.shapeTemplate.bevelSize,
          bevelCorner,
        }
        break
    }

    const updatedRoom: RoomEntity = {
      ...room,
      name,
      shapeTemplate: template,
      vertices: shapeToVertices(template),
    }

    onSave(updatedRoom)
    onOpenChange(false)
  }

  if (!room) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Room Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-width">Width</Label>
              <Input
                id="edit-width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-height">Height</Label>
              <Input
                id="edit-height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>

          {room.shapeTemplate.type === "l-shaped" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cut-width">Cut Width</Label>
                  <Input
                    id="edit-cut-width"
                    value={cutWidth}
                    onChange={(e) => setCutWidth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cut-height">Cut Height</Label>
                  <Input
                    id="edit-cut-height"
                    value={cutHeight}
                    onChange={(e) => setCutHeight(e.target.value)}
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

          {room.shapeTemplate.type === "beveled" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-bevel-size">Bevel Size</Label>
                <Input
                  id="edit-bevel-size"
                  value={bevelSize}
                  onChange={(e) => setBevelSize(e.target.value)}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

