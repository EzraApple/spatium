# Spatium

A lightweight, real-time collaborative apartment layout editor.

## The Story

This started as a bit of a joke. I was moving and my roommate was on the other side of the country doing random stuff. We needed to figure out our apartment layout but couldn't exactly stand in the same room pointing at where the couch should go. So I threw this together so we could plan it out in real-time.

The first version was scrappy and just for us. But once it worked, I realized this could actually be useful to other people in the same situation. So I cleaned it up and made it into a proper little tool.

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

## Acknowledgments

Vibe coded with [Claude Opus 4.5](https://www.anthropic.com/claude).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
