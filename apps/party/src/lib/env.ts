const isDev = process.env.NODE_ENV !== "production"

export const env = {
  isDev,
} as const

