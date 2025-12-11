const STORAGE_KEY = "spatium-visited-rooms"
const MAX_ROOMS = 10

export type VisitedRoom = {
  code: string
  visitedAt: number
}

export function getVisitedRooms(): VisitedRoom[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as VisitedRoom[]
  } catch {
    return []
  }
}

export function addVisitedRoom(code: string): void {
  const rooms = getVisitedRooms()
  const filtered = rooms.filter((r) => r.code !== code)
  const updated = [{ code, visitedAt: Date.now() }, ...filtered].slice(0, MAX_ROOMS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function removeVisitedRoom(code: string): void {
  const rooms = getVisitedRooms()
  const filtered = rooms.filter((r) => r.code !== code)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}


