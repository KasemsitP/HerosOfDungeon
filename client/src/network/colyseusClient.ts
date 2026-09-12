import { Client, Room } from "colyseus.js";
import { CreateRoomResponse, JoinOptions, PRACTICE_ROOM_NAME, ResolveRoomCodeResponse, ROOM_NAME } from "@hnd/shared";
import { BattleStateView } from "./types";

// VITE_SERVER_URL is baked in at build time (see client/.env.development for
// local dev, which points at the separate dev server on :2567). Production
// builds don't set it, since client and server are deployed as one Railway
// service on one domain -- same-origin is the correct endpoint there, and
// hardcoding localhost would make the deployed client try to dial the
// player's own machine instead of the real server.
const ENDPOINT =
  import.meta.env.VITE_SERVER_URL ?? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
const HTTP_BASE = ENDPOINT.replace(/^ws/, "http");

let client: Client | null = null;

function getClient(): Client {
  if (!client) client = new Client(ENDPOINT);
  return client;
}

export async function joinBattle(options: JoinOptions): Promise<Room<BattleStateView>> {
  return getClient().joinOrCreate<BattleStateView>(ROOM_NAME, options);
}

// Always creates a fresh, private room (never matched with another human) —
// a bot fills the other side server-side, see server/src/rooms/PracticeRoom.ts.
export async function joinPractice(options: JoinOptions): Promise<Room<BattleStateView>> {
  return getClient().create<BattleStateView>(PRACTICE_ROOM_NAME, options);
}

// Private-room-by-code flow (server/src/index.ts + server/src/rooms/PrivateRoom.ts).
export async function createPrivateRoom(): Promise<CreateRoomResponse> {
  const res = await fetch(`${HTTP_BASE}/api/rooms`, { method: "POST" });
  if (!res.ok) throw new Error("Could not create a room right now.");
  return res.json();
}

export async function resolveRoomCode(code: string): Promise<string> {
  const res = await fetch(`${HTTP_BASE}/api/rooms/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("Invalid or expired room code.");
  const data: ResolveRoomCodeResponse = await res.json();
  return data.roomId;
}

export async function joinRoomById(roomId: string, options: JoinOptions): Promise<Room<BattleStateView>> {
  return getClient().joinById<BattleStateView>(roomId, options);
}
