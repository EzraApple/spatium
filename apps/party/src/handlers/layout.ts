import type * as Party from "partykit/server"
import type {
  ClientMessage,
  ServerMessage,
  LayoutDocument,
  RoomEntity,
  FurnitureEntity,
  DoorEntity,
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
        (e) => {
          if (e.type === "room" && e.id === data.roomId) return false
          if (e.type === "furniture" && e.roomId === data.roomId) return false
          if (e.type === "door" && e.roomId === data.roomId) return false
          return true
        }
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
    } else if (data.type === "furniture-add") {
      this.document.entities.push(data.furniture)
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "furniture-added",
        furniture: data.furniture,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "furniture-update") {
      this.document.entities = this.document.entities.map((e) =>
        e.type === "furniture" && e.id === data.furniture.id ? data.furniture : e
      )
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "furniture-updated",
        furniture: data.furniture,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "furniture-delete") {
      this.document.entities = this.document.entities.filter(
        (e) => !(e.type === "furniture" && e.id === data.furnitureId)
      )
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "furniture-deleted",
        furnitureId: data.furnitureId,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "furniture-move") {
      this.document.entities = this.document.entities.map((e) =>
        e.type === "furniture" && e.id === data.furnitureId
          ? { ...e, position: data.position, roomId: data.roomId }
          : e
      ) as FurnitureEntity[]
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "furniture-moved",
        furnitureId: data.furnitureId,
        position: data.position,
        roomId: data.roomId,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "door-add") {
      this.document.entities.push(data.door)
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "door-added",
        door: data.door,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "door-update") {
      this.document.entities = this.document.entities.map((e) =>
        e.type === "door" && e.id === data.door.id ? data.door : e
      )
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "door-updated",
        door: data.door,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    } else if (data.type === "door-delete") {
      this.document.entities = this.document.entities.filter(
        (e) => !(e.type === "door" && e.id === data.doorId)
      )
      await this.persistDocument()

      const broadcastMessage: ServerMessage = {
        type: "door-deleted",
        doorId: data.doorId,
        clientId: sender.id,
      }
      this.broadcast(broadcastMessage, sender.id)
    }
  }
}

