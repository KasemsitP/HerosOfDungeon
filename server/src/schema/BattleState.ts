import { Schema, type, MapSchema } from "@colyseus/schema";
import { BattleStatus } from "@hnd/shared";
import { PlayerSchema } from "./PlayerSchema";
import { ProjectileSchema } from "./ProjectileSchema";

export class BattleState extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: ProjectileSchema }) projectiles = new MapSchema<ProjectileSchema>();
  @type("number") timeLeft = 0;
  @type("string") status: BattleStatus = "waiting";
  @type("string") winner = ""; // "hero" | "demon" | "draw" | ""
  @type("string") hostId = ""; // set by PrivateRoom (first joiner); empty in quick-match/practice
}
