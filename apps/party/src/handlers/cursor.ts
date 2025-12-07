import type * as Party from "partykit/server"
import {
  CURSOR_COLORS,
  type ClientMessage,
  type ClientState,
  type ServerMessage,
} from "@apartment-planner/shared"

export class CursorHandler {
  private clients: Map<string, ClientState> = new Map()
  private colorIndex = 0

  constructor(private room: Party.Room) {}

  private getNextColor(): string {
    const color = CURSOR_COLORS[this.colorIndex % CURSOR_COLORS.length]
    this.colorIndex++
    return color
  }

  private broadcast(message: ServerMessage, exclude?: string) {
    const data = JSON.stringify(message)
    for (const connection of this.room.getConnections()) {
      if (connection.id !== exclude) {
        connection.send(data)
      }
    }
  }

  onConnect(connection: Party.Connection) {
    const color = this.getNextColor()
    const clientState: ClientState = { color, x: 0, y: 0 }
    this.clients.set(connection.id, clientState)

    const syncMessage: ServerMessage = {
      type: "sync",
      clients: Object.fromEntries(this.clients),
    }
    connection.send(JSON.stringify(syncMessage))

    const joinMessage: ServerMessage = {
      type: "client-join",
      clientId: connection.id,
      color,
    }
    this.broadcast(joinMessage, connection.id)
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message) as ClientMessage

    if (data.type === "cursor-move") {
      const client = this.clients.get(sender.id)
      if (client) {
        client.x = data.x
        client.y = data.y

        const updateMessage: ServerMessage = {
          type: "cursor-update",
          clientId: sender.id,
          x: data.x,
          y: data.y,
        }
        this.broadcast(updateMessage, sender.id)
      }
    } else if (data.type === "cursor-leave") {
      const client = this.clients.get(sender.id)
      if (client) {
        client.x = -1
        client.y = -1

        const updateMessage: ServerMessage = {
          type: "cursor-update",
          clientId: sender.id,
          x: -1,
          y: -1,
        }
        this.broadcast(updateMessage, sender.id)
      }
    } else if (data.type === "cursor-click") {
      const client = this.clients.get(sender.id)
      if (client) {
        const clickMessage: ServerMessage = {
          type: "cursor-click",
          clientId: sender.id,
          x: data.x,
          y: data.y,
          color: client.color,
        }
        this.broadcast(clickMessage)
      }
    }
  }

  onClose(connection: Party.Connection) {
    this.clients.delete(connection.id)

    const leaveMessage: ServerMessage = {
      type: "client-leave",
      clientId: connection.id,
    }
    this.broadcast(leaveMessage)
  }
}

