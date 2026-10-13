import assert from "node:assert/strict"
import test from "node:test"
import type { ClientState, LayoutDocument, RoomEntity } from "@apartment-planner/shared"
import { CURSOR_COLORS } from "@apartment-planner/shared"
import type { Connection } from "partyserver"
import { CursorHandler } from "../src/handlers/cursor"
import { LayoutHandler } from "../src/handlers/layout"
import type { Database } from "../src/lib/db"

function connection(id: string, initialState: ClientState | null = null) {
  const sent: unknown[] = []
  const socket = {
    id,
    state: initialState,
    setState(state: ClientState) {
      this.state = state
      return state
    },
    send(message: string) {
      sent.push(JSON.parse(message))
    },
  }
  return { socket: socket as unknown as Connection, sent }
}

test("cursor presence comes from connection state after a handler restarts", () => {
  const first = connection("first", { color: CURSOR_COLORS[0], x: 10, y: 20 })
  const second = connection("second")
  const sockets = [first.socket, second.socket]
  const room = { getConnections: () => sockets }

  new CursorHandler(room).onConnect(second.socket)
  assert.equal((second.socket.state as ClientState).color, CURSOR_COLORS[1])
  assert.deepEqual(first.sent.at(-1), {
    type: "client-join",
    clientId: "second",
    color: CURSOR_COLORS[1],
  })
  assert.deepEqual(second.sent[0], {
    type: "sync",
    clients: {
      first: { color: CURSOR_COLORS[0], x: 10, y: 20 },
      second: { color: CURSOR_COLORS[1], x: 0, y: 0 },
    },
  })

  const restarted = new CursorHandler(room)
  restarted.onMessage(JSON.stringify({ type: "cursor-move", x: 30, y: 40 }), first.socket)
  assert.deepEqual(first.socket.state, { color: CURSOR_COLORS[0], x: 30, y: 40 })
  assert.deepEqual(second.sent.at(-1), {
    type: "cursor-update",
    clientId: "first",
    x: 30,
    y: 40,
  })

  sockets.splice(0, 1)
  restarted.onClose(first.socket)
  const replacement = connection("replacement")
  sockets.push(replacement.socket)
  restarted.onConnect(replacement.socket)
  assert.equal((replacement.socket.state as ClientState).color, CURSOR_COLORS[0])
})

test("a layout edit after wake loads Neon state before persisting", async () => {
  const original: RoomEntity = {
    type: "room",
    id: "original",
    name: "Original",
    position: { x: 0, y: 0 },
    shapeTemplate: { type: "rectangle", width: 100, height: 100 },
  }
  const added: RoomEntity = { ...original, id: "added", name: "Added" }
  const afterWake: RoomEntity = { ...original, id: "after-wake", name: "After wake" }
  let stored: LayoutDocument = { version: 2, entities: [original] }
  let reads = 0
  let writes = 0
  const sql = ((strings: TemplateStringsArray, ...params: unknown[]) => {
    const query = strings.join("?")
    if (query.includes("SELECT id, name, room_code, data")) {
      reads++
      return Promise.resolve([{ id: "layout-id", data: stored }])
    }
    if (query.includes("UPDATE layouts")) {
      writes++
      stored = JSON.parse(params[0] as string) as LayoutDocument
      return Promise.resolve([{ id: "layout-id", data: stored }])
    }
    throw new Error(`Unexpected query: ${query}`)
  }) as Database
  const participant = connection("participant")
  const room = { name: "ABC123", getConnections: () => [participant.socket] }

  const initial = new LayoutHandler(room, () => sql)
  await Promise.all([
    initial.onConnect(participant.socket),
    initial.onMessage(JSON.stringify({ type: "room-add", room: added }), participant.socket),
  ])
  assert.equal(reads, 1)
  assert.equal(writes, 1)
  assert.deepEqual(stored.entities.map((entity) => entity.id), ["original", "added"])

  const restarted = new LayoutHandler(room, () => sql)
  await restarted.onMessage(
    JSON.stringify({ type: "room-add", room: afterWake }),
    participant.socket
  )
  assert.equal(reads, 2)
  assert.equal(writes, 2)
  assert.deepEqual(stored.entities.map((entity) => entity.id), ["original", "added", "after-wake"])
})
