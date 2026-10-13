import type { Connection } from "partyserver"
import {
  CURSOR_COLORS,
  type ClientMessage,
  type ClientState,
  type ServerMessage,
} from "@apartment-planner/shared"

type Room = { getConnections(): Iterable<Connection> }

export class CursorHandler {
  constructor(private room: Room) {}

  private getClients(): Record<string, ClientState> {
    const clients: Record<string, ClientState> = {}
    for (const connection of this.room.getConnections()) {
      const state = connection.state as ClientState | null
      if (state) clients[connection.id] = state
    }
    return clients
  }

  private getNextColor(): string {
    const clients = Object.values(this.getClients())
    const usedColors = new Set(clients.map((client) => client.color))
    return CURSOR_COLORS.find((color) => !usedColors.has(color))
      ?? CURSOR_COLORS[clients.length % CURSOR_COLORS.length]
  }

  private broadcast(message: ServerMessage, exclude?: string) {
    const data = JSON.stringify(message)
    for (const connection of this.room.getConnections()) {
      if (connection.id !== exclude) connection.send(data)
    }
  }

  onConnect(connection: Connection) {
    const color = this.getNextColor()
    connection.setState({ color, x: 0, y: 0 })

    const syncMessage: ServerMessage = {
      type: "sync",
      clients: this.getClients(),
    }
    connection.send(JSON.stringify(syncMessage))

    const joinMessage: ServerMessage = {
      type: "client-join",
      clientId: connection.id,
      color,
    }
    this.broadcast(joinMessage, connection.id)
  }

  onMessage(message: string, sender: Connection) {
    const data = JSON.parse(message) as ClientMessage
    const client = sender.state as ClientState | null
    if (!client) return

    if (data.type === "cursor-move" || data.type === "cursor-leave") {
      const x = data.type === "cursor-leave" ? -1 : data.x
      const y = data.type === "cursor-leave" ? -1 : data.y
      sender.setState({ ...client, x, y })
      this.broadcast({ type: "cursor-update", clientId: sender.id, x, y }, sender.id)
    } else if (data.type === "cursor-click") {
      this.broadcast({
        type: "cursor-click",
        clientId: sender.id,
        x: data.x,
        y: data.y,
        color: client.color,
      })
    }
  }

  onClose(connection: Connection) {
    this.broadcast({ type: "client-leave", clientId: connection.id })
  }
}
