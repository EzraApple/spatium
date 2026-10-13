import { routePartykitRequest, Server, type Connection, type WSMessage } from "partyserver"
import { CursorHandler } from "./handlers/cursor"
import { LayoutHandler } from "./handlers/layout"
import { handleHttpRequest } from "./handlers/http"
import { createDatabase, type Database } from "./lib/db"

interface Env extends Cloudflare.Env {
  Main: DurableObjectNamespace<SpatiumServer>
  DATABASE_URL: string
}

export class SpatiumServer extends Server<Env> {
  static options = { hibernate: true }

  private cursorHandler = new CursorHandler(this)
  private layoutHandler = new LayoutHandler(this, () => this.getDatabase())
  private database?: Database

  private getDatabase(): Database {
    return (this.database ??= createDatabase(this.env.DATABASE_URL))
  }

  async onConnect(connection: Connection) {
    this.cursorHandler.onConnect(connection)
    await this.layoutHandler.onConnect(connection)
  }

  async onMessage(sender: Connection, message: WSMessage) {
    if (typeof message !== "string") return
    const data = JSON.parse(message)

    if (data.type.startsWith("cursor-")) {
      this.cursorHandler.onMessage(message, sender)
    } else if (data.type.startsWith("room-") || data.type.startsWith("furniture-") || data.type.startsWith("door-")) {
      await this.layoutHandler.onMessage(message, sender)
    }
  }

  onClose(connection: Connection) {
    this.cursorHandler.onClose(connection)
  }

  onRequest(request: Request): Promise<Response> {
    return handleHttpRequest(request, this.getDatabase())
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(request, env)) ?? new Response("Not found", { status: 404 })
  },
} satisfies ExportedHandler<Env>
