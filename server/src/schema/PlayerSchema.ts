import { Schema, type } from "@colyseus/schema";
import { AnimState, Side } from "@hnd/shared";

export class PlayerSchema extends Schema {
  @type("string") name = "";
  @type("string") side: Side = "hero";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("string") animState: AnimState = "idle";
  @type("boolean") facingLeft = false;
  @type("boolean") connected = true;

  // Server-only simulation state. Not synced to clients.
  vx = 0;
  vy = 0;
  grounded = true;
  moveDir: -1 | 0 | 1 = 0;

  // Combat: per-skill cooldown timestamps + which attack is currently active.
  lastAttack1At = 0;
  lastAttack2At = 0;
  lastAttack3At = 0;
  attackActiveUntil = 0;
  currentSkill: "attack1" | "attack2" | "attack3" = "attack1";

  // Run detection (hold-duration, server-derived from moveDir).
  moveDirSince = 0;
  running = false;

  // Defend: held while the client sends defendStart, cleared on defendStop.
  defending = false;

  // Knockback impulse from being hit by a run+attack.
  knockbackVx = 0;
  knockbackUntil = 0;
}
