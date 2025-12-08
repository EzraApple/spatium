import type * as Party from "partykit/server"
import { 
  createLayout, 
  getLayoutById, 
  getLayoutByRoomCode, 
  getLayoutsByRoomCodes,
  updateLayoutName,
  roomCodeExists 
} from "../lib/db"

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

function cors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function handleHttpRequest(request: Party.Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === "OPTIONS") {
    return cors()
  }

  try {
    if (request.method === "POST" && path.endsWith("/layout")) {
      let roomCode = generateRoomCode()
      let attempts = 0
      
      while (attempts < 10) {
        const exists = await roomCodeExists(roomCode)
        if (!exists) break
        roomCode = generateRoomCode()
        attempts++
      }

      const layout = await createLayout(roomCode)
      return json({ id: layout.id, roomCode: layout.room_code, name: layout.name, data: layout.data })
    }

    const layoutIdMatch = path.match(/\/layout\/([a-f0-9-]+)$/i)
    if (layoutIdMatch) {
      const id = layoutIdMatch[1]

      if (request.method === "GET") {
        const layout = await getLayoutById(id)
        if (!layout) {
          return json({ error: "Layout not found" }, 404)
        }
        return json({ id: layout.id, roomCode: layout.room_code, name: layout.name, data: layout.data })
      }

      if (request.method === "PATCH") {
        const body = await request.json() as { name?: string }
        if (!body.name) {
          return json({ error: "Name is required" }, 400)
        }
        const layout = await updateLayoutName(id, body.name)
        if (!layout) {
          return json({ error: "Layout not found" }, 404)
        }
        return json({ id: layout.id, roomCode: layout.room_code, name: layout.name, data: layout.data })
      }
    }

    const codeMatch = path.match(/\/layout\/code\/([A-Z0-9]+)$/i)
    if (codeMatch && request.method === "GET") {
      const code = codeMatch[1].toUpperCase()
      const layout = await getLayoutByRoomCode(code)
      if (!layout) {
        return json({ error: "Layout not found" }, 404)
      }
      return json({ id: layout.id, roomCode: layout.room_code, name: layout.name, data: layout.data })
    }

    if (path.endsWith("/layouts/batch") && request.method === "POST") {
      const body = await request.json() as { codes?: string[] }
      if (!body.codes || !Array.isArray(body.codes)) {
        return json({ error: "codes array is required" }, 400)
      }
      const codes = body.codes.map((c) => c.toUpperCase()).slice(0, 20)
      const layouts = await getLayoutsByRoomCodes(codes)
      return json(
        layouts.map((l) => ({ id: l.id, roomCode: l.room_code, name: l.name }))
      )
    }

    return json({ error: "Not found" }, 404)
  } catch (error) {
    console.error("HTTP handler error:", error)
    return json({ error: "Internal server error" }, 500)
  }
}
