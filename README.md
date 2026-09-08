# Heroes and Dungeons

2D multiplayer PvP (Hero vs Demon). React + Phaser 3 client, Colyseus game server, shared TypeScript types/constants.

## Requirements

- Node.js 20+

## Setup

```bash
npm install
npm run build:shared   # shared must be built once before server/client type-check against it
```

## Run (two terminals)

```bash
npm run dev:server   # ws://localhost:2567
npm run dev:client   # http://localhost:5173
```

Open `http://localhost:5173` in two browser tabs (or two devices) to play a match: enter a name, pick Hero or Demon, "Find Match". Controls: ←/→ walk, ↑ jump, Space attack.

If the client and server run on different hosts, copy `client/.env.example` to `client/.env` and set `VITE_SERVER_URL` to the server's WebSocket URL.

## Structure

- `shared/` — types & constants used by both client and server (HP, speed, attack range, timings). Server is authoritative; the client never computes its own HP or hit results.
- `server/` — Colyseus `BattleRoom` (matchmaking, game loop, hit detection, win conditions).
- `client/` — React shell (Lobby → Battle → Result) with a Phaser 3 scene for the arena.

## Current placeholder: art

Characters render as colored rectangles (`client/src/game/scenes/PreloadScene.ts`) since no sprite assets are bundled yet. Swap in real spritesheets from Kenney, itch.io (e.g. 0x72's DungeonTileset II), or CraftPix — replace the texture generation in `PreloadScene` with `this.load.spritesheet(...)` and add animations in `Hero.ts`/`Demon.ts`. Check each asset's license before shipping.
