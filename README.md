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

The production frontend remains on Vercel. A Cloudflare frontend deployment is
prepared at `spatium.dawn-king-4a90.workers.dev`, with static assets and single-page
app routing configured in `apps/web/wrangler.jsonc`. Vercel routing and automatic
Cloudflare deployments remain unchanged until the cutover is configured.

The realtime backend runs in the project's Cloudflare
account at `spatium-party.dawn-king-4a90.workers.dev`. Layouts remain in the existing
Neon Postgres database. Durable Objects coordinate each room and hibernate while
idle; they do not replace Neon as the layout store.

Build and deploy the frontend from the repository root:

```bash
pnpm --filter web build
pnpm --filter web run deploy
```

When ready to switch, add the chosen custom domain to the `spatium` Worker and
verify the app there. Update the README link and redirect the old Vercel URLs to
that domain, preserving editor paths and query parameters. Stop Vercel app builds
after verifying those redirects.

For automatic frontend deployments after merging this setup, connect the `EzraApple/spatium` GitHub
repository to the `spatium` Worker under Settings > Builds. Use production branch
`main`, root directory `apps/web`, build command `pnpm build`, and deploy
command `pnpm run deploy`. Set build environment variables
`NODE_VERSION=22.22.2` and `PNPM_VERSION=10.24.0`. Once connected, pushes to `main`,
including merged pull requests, build and deploy the frontend automatically.
The initial CLI deployment does not create this GitHub connection.

Each new hostname has its own browser storage, so its recent-layout list starts
empty. Existing layouts remain available with the same room codes and layout IDs.

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
