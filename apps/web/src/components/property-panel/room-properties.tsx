import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { RoomEntity, ShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor } from "@apartment-planner/shared"

type RoomPropertiesProps = {
  room: RoomEntity
  onUpdate: (room: RoomEntity) => void
  onDelete: (roomId: string) => void
}

export function RoomProperties({ room, onUpdate, onDelete }: RoomPropertiesProps) {
  const [name, setName] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [cutWidth, setCutWidth] = useState("")
  const [cutHeight, setCutHeight] = useState("")
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")
  const [bevelSize, setBevelSize] = useState("")
  const [bevelCorner, setBevelCorner] = useState<Corner>("top-right")

  useEffect(() => {
    setName(room.name)
    setWidth(formatInchesForEditor(room.shapeTemplate.width))
    setHeight(formatInchesForEditor(room.shapeTemplate.height))

    if (room.shapeTemplate.type === "l-shaped") {
      setCutWidth(formatInchesForEditor(room.shapeTemplate.cutWidth))
      setCutHeight(formatInchesForEditor(room.shapeTemplate.cutHeight))
      setCutCorner(room.shapeTemplate.cutCorner)
    }

    if (room.shapeTemplate.type === "beveled") {
      setBevelSize(formatInchesForEditor(room.shapeTemplate.bevelSize))
      setBevelCorner(room.shapeTemplate.bevelCorner)
    }
  }, [room])

  const handleSave = useCallback((overrides?: { cutCorner?: Corner; bevelCorner?: Corner }) => {
    const widthEighths = parseInchesFromEditor(width) ?? room.shapeTemplate.width
    const heightEighths = parseInchesFromEditor(height) ?? room.shapeTemplate.height

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
          cutWidth: parseInchesFromEditor(cutWidth) ?? room.shapeTemplate.cutWidth,
          cutHeight: parseInchesFromEditor(cutHeight) ?? room.shapeTemplate.cutHeight,
          cutCorner: overrides?.cutCorner ?? cutCorner,
        }
        break
      case "beveled":
        template = {
          type: "beveled",
          width: widthEighths,
          height: heightEighths,
          bevelSize: parseInchesFromEditor(bevelSize) ?? room.shapeTemplate.bevelSize,
          bevelCorner: overrides?.bevelCorner ?? bevelCorner,
        }
        break
    }

    onUpdate({
      ...room,
      name,
      shapeTemplate: template,
    })
  }, [room, name, width, height, cutWidth, cutHeight, cutCorner, bevelSize, bevelCorner, onUpdate])

  const handleBlur = () => handleSave()

  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-sidebar-border bg-sidebar shadow-lg animate-in slide-in-from-right-4 duration-200 cursor-hidden flex flex-col">
      <div className="p-4 pb-0">
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">Room</h3>
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

        {room.shapeTemplate.type === "l-shaped" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="prop-cut-width">Cut W (in)</Label>
                <Input
                  id="prop-cut-width"
                  value={cutWidth}
                  onChange={(e) => setCutWidth(e.target.value)}
                  onBlur={handleBlur}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-cut-height">Cut H (in)</Label>
                <Input
                  id="prop-cut-height"
                  value={cutHeight}
                  onChange={(e) => setCutHeight(e.target.value)}
                  onBlur={handleBlur}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cut Corner</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                  (corner) => (
                    <Button
                      key={corner}
                      type="button"
                      variant={cutCorner === corner ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setCutCorner(corner)
                        handleSave({ cutCorner: corner })
                      }}
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
              <Label htmlFor="prop-bevel-size">Bevel Size (in)</Label>
              <Input
                id="prop-bevel-size"
                value={bevelSize}
                onChange={(e) => setBevelSize(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
            <div className="space-y-2">
              <Label>Bevel Corner</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                  (corner) => (
                    <Button
                      key={corner}
                      type="button"
                      variant={bevelCorner === corner ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setBevelCorner(corner)
                        handleSave({ bevelCorner: corner })
                      }}
                    >
                      {corner.replace("-", " ")}
                    </Button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        <Separator className="my-4" />

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(room.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Room
        </Button>
      </div>
    </div>
  )
}

