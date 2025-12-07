const isDev = import.meta.env.DEV

export const env = {
  PARTYKIT_HOST: isDev ? "localhost:1999" : "spatium-party.partykit.dev",
} as const

