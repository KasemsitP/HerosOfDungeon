import { Client, Room } from "colyseus.js";
import { JoinOptions, PRACTICE_ROOM_NAME, ROOM_NAME } from "@hnd/shared";
import { BattleStateView } from "./types";

const ENDPOINT = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

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
