import { Schema, type } from "@colyseus/schema";
import { AttackSkill } from "@hnd/shared";

export class ProjectileSchema extends Schema {
  @type("string") ownerId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") damage = 0;
  @type("string") projectileType: "kunai" | "arrow" | "bolt" = "bolt";

  // Server-only: which skill spawned this, so a landed hit's broadcast
  // hitEvent can report the right attackType. Not synced -- the client only
  // needs projectileType to render it, never which skill fired it.
  skill: AttackSkill = "attack1";
}
