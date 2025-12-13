import type { ClientState, Point } from "@apartment-planner/shared"
import { Cursor } from "./cursor"

type WorldToScreen = (worldX: number, worldY: number) => Point

type CursorCanvasProps = {
  cursors: [string, ClientState][]
  worldToScreen: WorldToScreen | null
}

export function CursorCanvas({ cursors, worldToScreen }: CursorCanvasProps) {
  return (
    <>
      {cursors.map(([id, state]) => (
        <Cursor
          key={id}
          color={state.color}
          x={state.x}
          y={state.y}
          worldToScreen={worldToScreen}
        />
      ))}
    </>
  )
}
