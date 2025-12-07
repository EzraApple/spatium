export type ClientMessage =
  | { type: "cursor-move"; x: number; y: number }
  | { type: "cursor-leave" }
  | { type: "cursor-click"; x: number; y: number }

export type ServerMessage =
  | { type: "sync"; clients: Record<string, ClientState> }
  | { type: "cursor-update"; clientId: string; x: number; y: number }
  | { type: "client-join"; clientId: string; color: string }
  | { type: "client-leave"; clientId: string }
  | { type: "cursor-click"; clientId: string; x: number; y: number; color: string }

export type ClientState = {
  color: string
  x: number
  y: number
}

export type Layout = {
  id: string
  name: string
  roomCode: string
}
