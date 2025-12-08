import type * as Party from "partykit/server"
import type {
  ClientMessage,
  ServerMessage,
  LayoutDocument,
  RoomEntity,
  Point,
} from "@apartment-planner/shared"
import { getLayoutByRoomCode, updateLayoutData } from "../lib/db"

export class LayoutHandler {
  private document: LayoutDocument = { version: 1, entities: [] }
  private layoutId: string | null = null

  constructor(private room: Party.Room) {}

  private broadcast(message: ServerMessage, exclude?: string) {
    const data = JSON.stringify(message)
    for (const connection of this.room.getConnections()) {
      if (connection.id !== exclude) {
        connection.send(data)
      }
    }
  }

  private async persistDocument() {
    if (this.layoutId) {
      await updateLayoutData(this.layoutId, this.document)
    }
  }

  async onConnect(connection: Party.Connection) {
    if (!this.layoutId) {
      const layout = await getLayoutByRoomCode(this.room.id)
      if (layout) {
        this.layoutId = layout.id
        this.document = layout.data as LayoutDocument
      }
    }

    const syncMessage: ServerMessage = {
      type: "layout-sync",
      document: this.document,
    }
    connection.send(JSON.stringify(syncMessage))
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message) as ClientMessage

    if (data.type === "room-add") {
      this.document.entities.push(data.room)
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "room-added",
        room: data.room,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "room-update") {
      this.document.entities = this.document.entities.map((e) =>
        e.type === "room" && e.id === data.room.id ? data.room : e
      )
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "room-updated",
        room: data.room,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "room-delete") {
      this.document.entities = this.document.entities.filter(
        (e) => !(e.type === "room" && e.id === data.roomId)
      )
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "room-deleted",
        roomId: data.roomId,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "room-move") {
      this.document.entities = this.document.entities.map((e) =>
        e.type === "room" && e.id === data.roomId
          ? { ...e, position: data.position }
          : e
      ) as RoomEntity[]
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "room-moved",
        roomId: data.roomId,
        position: data.position,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    }
  }
}

