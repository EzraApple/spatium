const isDev = import.meta.env.DEV

export const env = {
  PARTYKIT_HOST: import.meta.env.VITE_PARTYKIT_HOST ?? (
    isDev ? "localhost:1999" : "spatium-party.dawn-king-4a90.workers.dev"
  ),
} as const
