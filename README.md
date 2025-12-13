# Spatium

Collaborative apartment layout editor with real-time cursor presence. Currently in MVP stage demonstrating real-time infrastructure.

## Architecture

Turborepo + pnpm workspace monorepo:

- `apps/web` - Vite + React + Tailwind frontend
- `apps/party` - PartyKit WebSocket server
- `packages/shared` - Shared types and constants

## Local Development

```bash
# Install dependencies
pnpm install

# Start both apps (Vite on :5173, PartyKit on :1999)
pnpm dev
```

Open `http://localhost:5173` in multiple browser tabs to see cursor sync in action.

## Deployment

### PartyKit (WebSocket Server)

PartyKit hosts the WebSocket server on their infrastructure.

```bash
# Authenticate with PartyKit (one-time)
npx partykit login

# Deploy from the party app
cd apps/party
pnpm deploy
```

The server will be live at `spatium-party.partykit.dev` (or whatever name is set in `partykit.json`).

### Vercel (Web Frontend)

1. Push your code to GitHub
2. Import the repo in Vercel
3. Configure the project:
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm build --filter web`
   - **Install Command**: `cd ../.. && pnpm install`
   - **Output Directory**: `dist`
4. Deploy

After deploying PartyKit, update the production host in `apps/web/src/lib/env.ts` if the URL differs from `spatium-party.partykit.dev`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps |
| `pnpm typecheck` | Type check all packages |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
