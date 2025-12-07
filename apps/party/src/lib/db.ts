import { neon } from "@neondatabase/serverless"
import { env } from "./env"

export const sql = neon(env.DATABASE_URL)

export type Layout = {
  id: string
  name: string
  room_code: string
  created_at: Date
  updated_at: Date
}

export async function createLayout(roomCode: string): Promise<Layout> {
  const rows = await sql`
    INSERT INTO layouts (id, name, room_code, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Untitled Layout', ${roomCode}, NOW(), NOW())
    RETURNING id, name, room_code, created_at, updated_at
  `
  return rows[0] as Layout
}

export async function getLayoutById(id: string): Promise<Layout | null> {
  const rows = await sql`
    SELECT id, name, room_code, created_at, updated_at
    FROM layouts
    WHERE id = ${id}
  `
  return (rows[0] as Layout) ?? null
}

export async function getLayoutByRoomCode(roomCode: string): Promise<Layout | null> {
  const rows = await sql`
    SELECT id, name, room_code, created_at, updated_at
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
    RETURNING id, name, room_code, created_at, updated_at
  `
  return (rows[0] as Layout) ?? null
}

export async function roomCodeExists(roomCode: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM layouts WHERE room_code = ${roomCode} LIMIT 1
  `
  return rows.length > 0
}
