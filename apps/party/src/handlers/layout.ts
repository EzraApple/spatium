import type * as Party from "partykit/server"
import type {
  ClientMessage,
  ServerMessage,
  LayoutDocument,
  Entity,
} from "@apartment-planner/shared"
import {
  addEntity,
  deleteRoomWithContents,
  deleteEntity,
  moveRoom,
  moveFurniture,
  normalizeLayoutDocument,
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

  private updateEntities(entities: Entity[]) {
    this.document = normalizeLayoutDocument({ ...this.document, entities }).document
  }

  async onConnect(connection: Party.Connection) {
    if (!this.layoutId) {
      const layout = await getLayoutByRoomCode(this.room.id)
      if (layout) {
        this.layoutId = layout.id
        const normalized = normalizeLayoutDocument(layout.data as LayoutDocument)
        this.document = normalized.document
        if (normalized.didChange) {
          await this.persistDocument()
        }
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
      this.updateEntities(addEntity(this.document.entities, data.room))
      await this.persistDocument()
      this.broadcast({ type: "room-added", room: data.room, clientId: sender.id }, sender.id)
    } else if (data.type === "room-update") {
      this.updateEntities(
        this.document.entities.map((e) =>
          e.type === "room" && e.id === data.room.id ? data.room : e
        )
      )
      await this.persistDocument()
      this.broadcast({ type: "room-updated", room: data.room, clientId: sender.id }, sender.id)
    } else if (data.type === "room-delete") {
      this.updateEntities(deleteRoomWithContents(this.document.entities, data.roomId))
      await this.persistDocument()
      this.broadcast({ type: "room-deleted", roomId: data.roomId, clientId: sender.id }, sender.id)
    } else if (data.type === "room-move") {
      this.updateEntities(moveRoom(this.document.entities, data.roomId, data.position))
      await this.persistDocument()
      this.broadcast(
        { type: "room-moved", roomId: data.roomId, position: data.position, clientId: sender.id },
        sender.id
      )
    } else if (data.type === "furniture-add") {
      this.updateEntities(addEntity(this.document.entities, data.furniture))
      await this.persistDocument()
      this.broadcast({ type: "furniture-added", furniture: data.furniture, clientId: sender.id }, sender.id)
    } else if (data.type === "furniture-update") {
      this.updateEntities(
        this.document.entities.map((e) =>
          e.type === "furniture" && e.id === data.furniture.id ? data.furniture : e
        )
      )
      await this.persistDocument()
      this.broadcast({ type: "furniture-updated", furniture: data.furniture, clientId: sender.id }, sender.id)
    } else if (data.type === "furniture-delete") {
      this.updateEntities(deleteEntity(this.document.entities, "furniture", data.furnitureId))
      await this.persistDocument()
      this.broadcast({ type: "furniture-deleted", furnitureId: data.furnitureId, clientId: sender.id }, sender.id)
    } else if (data.type === "furniture-move") {
      this.updateEntities(
        moveFurniture(this.document.entities, data.furnitureId, data.position, data.roomId)
      )
      await this.persistDocument()
      this.broadcast(
        {
          type: "furniture-moved",
          furnitureId: data.furnitureId,
          position: data.position,
          roomId: data.roomId,
          clientId: sender.id,
        },
        sender.id
      )
    } else if (data.type === "door-add") {
      this.updateEntities(addEntity(this.document.entities, data.door))
      await this.persistDocument()
      this.broadcast({ type: "door-added", door: data.door, clientId: sender.id }, sender.id)
    } else if (data.type === "door-update") {
      this.updateEntities(
        this.document.entities.map((e) =>
          e.type === "door" && e.id === data.door.id ? data.door : e
        )
      )
      await this.persistDocument()
      this.broadcast({ type: "door-updated", door: data.door, clientId: sender.id }, sender.id)
    } else if (data.type === "door-delete") {
      this.updateEntities(deleteEntity(this.document.entities, "door", data.doorId))
      await this.persistDocument()
      this.broadcast({ type: "door-deleted", doorId: data.doorId, clientId: sender.id }, sender.id)
    }
  }
}
