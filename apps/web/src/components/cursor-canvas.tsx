import type { ClientState } from "@apartment-planner/shared"
import { Cursor } from "./cursor"

type CursorCanvasProps = {
  cursors: [string, ClientState][]
}

export function CursorCanvas({ cursors }: CursorCanvasProps) {
  return (
    <>
      {cursors.map(([id, state]) => (
        <Cursor key={id} color={state.color} x={state.x} y={state.y} />
      ))}
    </>
  )
}

