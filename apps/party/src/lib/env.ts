const isDev = process.env.NODE_ENV !== "production"

export const env = {
  isDev,
  DATABASE_URL: process.env.DATABASE_URL ?? "",
} as const

if (!env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Database operations will fail.")
}
