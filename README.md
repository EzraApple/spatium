# [Spatium](https://spatium-snowy.vercel.app/)

A lightweight, real-time collaborative apartment layout editor.

## The Story

This started as a bit of a joke. I was moving and my roommate was on the other side of the country doing random stuff. We needed to figure out our apartment layout but couldn't exactly stand in the same room pointing at where the couch should go. So I threw this together so we could plan it out in real-time.

The first version was scrappy and just for us. But once it worked, I realized this could actually be useful to other people in the same situation. So I cleaned it up and made it into a proper little tool.

## Architecture

Turborepo + pnpm workspace monorepo:

- `apps/web` - Vite + React + Tailwind frontend
- `apps/party` - PartyServer WebSocket server on Cloudflare Workers
- `packages/shared` - Shared types and constants

## Local Development

Use Node.js 22 or later and the pnpm version specified in `package.json`.

```bash
# Install dependencies
pnpm install

# Set DATABASE_URL in apps/party/.env to the existing Neon connection string.

# Start both apps (Vite on :5173, Wrangler on :1999)
pnpm dev
```

Open `http://localhost:5173` in multiple browser tabs to see cursor sync in action.

## Deployment

The frontend runs on Vercel. The realtime backend runs in the project's Cloudflare
account at `spatium-party.dawn-king-4a90.workers.dev`. Layouts remain in the existing
Neon Postgres database. Durable Objects coordinate each room and hibernate while
idle; they do not replace Neon as the layout store.

From `apps/party`, configure the existing Neon connection string as a Worker secret
with `pnpm exec wrangler secret put DATABASE_URL`, then deploy with `pnpm run deploy`.
Use `pnpm exec wrangler login` if the CLI is not already authenticated.

The frontend's default production host is configured in `apps/web/src/lib/env.ts`.
Set `VITE_PARTYKIT_HOST` at build time to test against another backend. Redeploy the
frontend after changing hosts, and refresh open pages to use the new server.

## Acknowledgments

Vibe coded with [Claude Opus 4.5](https://www.anthropic.com/claude).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
