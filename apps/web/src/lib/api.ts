import { env } from "./env"
import type { Layout } from "@apartment-planner/shared"

const getBaseUrl = () => {
  const protocol = env.PARTYKIT_HOST.includes("localhost") ? "http" : "https"
  return `${protocol}://${env.PARTYKIT_HOST}/parties/main/main`
}

export async function createLayout(): Promise<Layout> {
  const res = await fetch(`${getBaseUrl()}/layout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) throw new Error("Failed to create layout")
  return res.json()
}

export async function getLayout(id: string): Promise<Layout> {
  const res = await fetch(`${getBaseUrl()}/layout/${id}`)
  if (!res.ok) throw new Error("Layout not found")
  return res.json()
}

export async function getLayoutByCode(code: string): Promise<Layout> {
  const res = await fetch(`${getBaseUrl()}/layout/code/${code}`)
  if (!res.ok) throw new Error("Layout not found")
  return res.json()
}

export async function updateLayoutName(id: string, name: string): Promise<Layout> {
  const res = await fetch(`${getBaseUrl()}/layout/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("Failed to update layout")
  return res.json()
}

