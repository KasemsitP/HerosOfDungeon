import { createServer } from "http";
import path from "path";
import express from "express";
import cors from "cors";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { PRACTICE_ROOM_NAME, PRIVATE_ROOM_NAME, ROOM_NAME } from "@hnd/shared";
import { BattleRoom } from "./rooms/BattleRoom";
import { PracticeRoom } from "./rooms/PracticeRoom";
import { PrivateRoom } from "./rooms/PrivateRoom";
import { registerCode, resolveCode } from "./rooms/roomCodeRegistry";

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define(ROOM_NAME, BattleRoom);
gameServer.define(PRACTICE_ROOM_NAME, PracticeRoom);
gameServer.define(PRIVATE_ROOM_NAME, PrivateRoom);

// Private-room-by-code flow. This room is only ever reached via
// matchMaker.createRoom (here) and client.joinById (both host and guest,
// once they have a roomId) -- never through joinOrCreate matchmaking -- so
// it's inherently private with no extra setPrivate() call needed.
app.post("/api/rooms", async (_req, res) => {
  const room = await matchMaker.createRoom(PRIVATE_ROOM_NAME, {});
  const code = registerCode(room.roomId);
  res.json({ code, roomId: room.roomId });
});

app.get("/api/rooms/:code", (req, res) => {
  const roomId = resolveCode(req.params.code);
  if (!roomId) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ roomId });
});

// Serve the built React/Phaser client from the same service, so client and
// server share one Railway deployment and one origin (no CORS needed in
// production). The client has no client-side router -- it's a single page
// that switches views via React state -- so express.static's default
// "serve index.html for /" behavior is enough; no SPA catch-all route needed.
app.use(express.static(path.join(__dirname, "../../client/dist")));

httpServer.listen(PORT, () => {
  console.log(`Heroes and Dungeons server listening on ws://localhost:${PORT}`);
});
