import { Schema, type, MapSchema } from "@colyseus/schema";
import { BattleStatus } from "@hnd/shared";
import { PlayerSchema } from "./PlayerSchema";

export class BattleState extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type("number") timeLeft = 0;
  @type("string") status: BattleStatus = "waiting";
  @type("string") winner = ""; // "hero" | "demon" | "draw" | ""
}
