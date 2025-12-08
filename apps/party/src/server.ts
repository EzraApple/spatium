import type * as Party from "partykit/server"
import { CursorHandler } from "./handlers/cursor"
import { LayoutHandler } from "./handlers/layout"
import { handleHttpRequest } from "./handlers/http"

export default class SpatiumServer implements Party.Server {
  private cursorHandler: CursorHandler
  private layoutHandler: LayoutHandler

  constructor(readonly room: Party.Room) {
    this.cursorHandler = new CursorHandler(room)
    this.layoutHandler = new LayoutHandler(room)
  }

  async onConnect(connection: Party.Connection) {
    this.cursorHandler.onConnect(connection)
    await this.layoutHandler.onConnect(connection)
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message)

    if (data.type.startsWith("cursor-")) {
      this.cursorHandler.onMessage(message, sender)
    } else if (data.type.startsWith("room-")) {
      await this.layoutHandler.onMessage(message, sender)
    }
  }

  onClose(connection: Party.Connection) {
    this.cursorHandler.onClose(connection)
  }

  async onRequest(request: Party.Request): Promise<Response> {
    return handleHttpRequest(request)
  }
}

SpatiumServer satisfies Party.Worker
