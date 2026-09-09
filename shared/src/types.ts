export type Side = "hero" | "demon";

export type CharacterClass = "knight" | "ninja" | "wizard" | "samurai";

// Meaningful only for "samurai" -- every other class ignores this field.
export type WeaponType = "sword" | "bow";

export type AttackMode = "melee" | "ranged";

export type CharacterSkin =
  | "knight-1"
  | "knight-2"
  | "knight-3"
  | "ninja-1"
  | "ninja-2"
  | "ninja-3"
  | "wizard-1"
  | "wizard-2"
  | "wizard-3"
  | "samurai-1"
  | "samurai-2"
  | "samurai-bow"; // render prefix for samurai in bow mode; selectable at join as a "start in bow mode" signal, never actually stored as PlayerSchema.skin

// Melee classes hit instantly within range; ranged classes spawn a
// Projectile instead. Samurai is the only class that switches between the
// two at runtime (weaponType). Shared so client input/UI and the server's
// attack routing + defend rejection use the exact same rule.
export function getAttackMode(characterClass: CharacterClass, weaponType: WeaponType): AttackMode {
  if (characterClass === "knight") return "melee";
  if (characterClass === "samurai") return weaponType === "bow" ? "ranged" : "melee";
  return "ranged"; // ninja, wizard
}

// The texture prefix actually rendered for a player -- differs from their
// chosen `skin` only for samurai in bow mode, which uses a fully separate
// sprite set (Samurai_Archer), not a held-item overlay on the sword skin.
export function resolveRenderSkin(characterClass: CharacterClass, skin: CharacterSkin, weaponType: WeaponType): CharacterSkin {
  return characterClass === "samurai" && weaponType === "bow" ? "samurai-bow" : skin;
}

export type AnimState =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "attack1"
  | "attack2"
  | "attack3"
  | "runAttack"
  | "protect"
  | "hurt"
  | "dead";

export type BattleStatus = "waiting" | "playing" | "finished";

// Client -> server messages. The client only ever sends *intent*; the server
// decides what actually happens to position/HP.
export interface JoinOptions {
  name: string;
  side: Side;
  characterClass?: CharacterClass;
  skin?: CharacterSkin;
}

export interface MoveInputMessage {
  dir: -1 | 0 | 1;
}

// "jump", "switchWeapon", "toggleReady" and "startGame" carry no payload.
// Attacks/defend go through "action" with a type tag; running has no message
// of its own -- the server derives it from how long "move" has held a nonzero dir.
export const MessageType = {
  Move: "move",
  Jump: "jump",
  Action: "action",
  SwitchWeapon: "switchWeapon",
  ToggleReady: "toggleReady",
  StartGame: "startGame",
  SelectCharacter: "selectCharacter",
} as const;

// The wire-level Action message type -- everything the client can send via
// MessageType.Action, including defend. Narrower than this is AttackSkill
// below, which covers only the 3 attack variants and is used for the
// cooldown table / currentSkill, where "defend" doesn't apply.
export type ActionType = "attack1" | "attack2" | "attack3" | "defendStart" | "defendStop";

export interface ActionMessage {
  type: ActionType;
}

export interface SelectCharacterMessage {
  characterClass: CharacterClass;
  skin: CharacterSkin;
}

// The 3 attack variants -- see the ActionType comment above for how this
// differs from it. Used for the server's per-skill cooldown table/
// currentSkill, and for tagging which skill landed a hit (see HitAttackType).
export type AttackSkill = "attack1" | "attack2" | "attack3";

// Everything a landed hit can be tagged as, for hit-feedback purposes
// (damage number size, SFX variant). "runAttack" isn't a distinct skill --
// it's attack1 thrown while running -- but it hits harder/knocks back more,
// so hit feedback treats it as its own case.
export type HitAttackType = AttackSkill | "runAttack";

// Server -> client one-off broadcast (BattleRoom.resolveHit -> BattleScene),
// NOT a schema field. A landed hit is a momentary event, not persistent
// state -- if it lived in PlayerSchema, a client that reconnects mid-match
// would see the last hit's data still sitting there and misfire hit-feedback
// (sound/damage number/screen shake) for something that isn't actually
// happening right now.
export const HIT_EVENT = "hitEvent";

export interface HitEventMessage {
  targetId: string;
  damage: number; // amount actually applied (post block-reduction if blocked)
  wasBlocked: boolean;
  attackType: HitAttackType;
  x: number;
  y: number;
  targetDied: boolean;
}

// HTTP responses for the private-room-by-code flow (server/src/index.ts).
export interface CreateRoomResponse {
  code: string;
  roomId: string;
}

export interface ResolveRoomCodeResponse {
  roomId: string;
}
