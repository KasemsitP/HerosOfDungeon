import { Schema, type } from "@colyseus/schema";
import { AnimState, CharacterClass, CharacterSkin, SHIELD_MAX_DURABILITY, Side, WeaponType } from "@hnd/shared";

export class PlayerSchema extends Schema {
  @type("string") name = "";
  @type("string") side: Side = "hero";
  @type("string") characterClass: CharacterClass = "knight";
  @type("string") skin: CharacterSkin = "knight-1";
  @type("string") weaponType: WeaponType = "sword"; // only meaningful for "samurai"
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("string") animState: AnimState = "idle";
  @type("boolean") facingLeft = false;
  @type("boolean") connected = true;
  @type("number") shieldDurability = SHIELD_MAX_DURABILITY;
  @type("boolean") shieldBroken = false;
  @type("boolean") ready = false; // pre-game ready-up, only meaningful in PrivateRoom

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
  lastWeaponSwitchAt = 0;

  // Run detection (hold-duration, server-derived from moveDir).
  moveDirSince = 0;
  running = false;

  // Defend: held while the client sends defendStart, cleared on defendStop.
  defending = false;

}
