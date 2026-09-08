import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { PRACTICE_ROOM_NAME, ROOM_NAME } from "@hnd/shared";
import { BattleRoom } from "./rooms/BattleRoom";
import { PracticeRoom } from "./rooms/PracticeRoom";

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

httpServer.listen(PORT, () => {
  console.log(`Heroes and Dungeons server listening on ws://localhost:${PORT}`);
});
