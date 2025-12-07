import type * as Party from "partykit/server"
import { CursorHandler } from "./handlers/cursor"
import { handleHttpRequest } from "./handlers/http"

export default class SpatiumServer implements Party.Server {
  private cursorHandler: CursorHandler

  constructor(readonly room: Party.Room) {
    this.cursorHandler = new CursorHandler(room)
  }

  onConnect(connection: Party.Connection) {
    this.cursorHandler.onConnect(connection)
  }

  onMessage(message: string, sender: Party.Connection) {
    this.cursorHandler.onMessage(message, sender)
  }

  onClose(connection: Party.Connection) {
    this.cursorHandler.onClose(connection)
  }

  async onRequest(request: Party.Request): Promise<Response> {
    return handleHttpRequest(request)
  }
}

SpatiumServer satisfies Party.Worker
