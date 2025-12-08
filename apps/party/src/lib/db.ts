import { neon } from "@neondatabase/serverless"
import { env } from "./env"
import type { LayoutDocument } from "@apartment-planner/shared"

export const sql = neon(env.DATABASE_URL)

const DEFAULT_DATA: LayoutDocument = { version: 1, entities: [] }

export type Layout = {
  id: string
  name: string
  room_code: string
  data: LayoutDocument
  created_at: Date
  updated_at: Date
}

export async function createLayout(roomCode: string): Promise<Layout> {
  const rows = await sql`
    INSERT INTO layouts (id, name, room_code, data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Untitled Layout', ${roomCode}, ${JSON.stringify(DEFAULT_DATA)}::jsonb, NOW(), NOW())
    RETURNING id, name, room_code, data, created_at, updated_at
  `
  return rows[0] as Layout
}

export async function getLayoutById(id: string): Promise<Layout | null> {
  const rows = await sql`
    SELECT id, name, room_code, data, created_at, updated_at
    FROM layouts
    WHERE id = ${id}
  `
  return (rows[0] as Layout) ?? null
}

export async function getLayoutByRoomCode(roomCode: string): Promise<Layout | null> {
  const rows = await sql`
    SELECT id, name, room_code, data, created_at, updated_at
    FROM layouts
    WHERE room_code = ${roomCode}
  `
  return (rows[0] as Layout) ?? null
}

export async function updateLayoutName(id: string, name: string): Promise<Layout | null> {
  const rows = await sql`
    UPDATE layouts
    SET name = ${name}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, name, room_code, data, created_at, updated_at
  `
  return (rows[0] as Layout) ?? null
}

export async function updateLayoutData(id: string, data: LayoutDocument): Promise<Layout | null> {
  const rows = await sql`
    UPDATE layouts
    SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, name, room_code, data, created_at, updated_at
  `
  return (rows[0] as Layout) ?? null
}

export async function roomCodeExists(roomCode: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM layouts WHERE room_code = ${roomCode} LIMIT 1
  `
  return rows.length > 0
}
