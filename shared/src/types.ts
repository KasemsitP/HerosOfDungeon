export type Side = "hero" | "demon";

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
}

export interface MoveInputMessage {
  dir: -1 | 0 | 1;
}

// "jump" carries no payload. Attacks/defend go through "action" with a type
// tag; running has no message of its own — the server derives it from how
// long "move" has held a nonzero dir.
export const MessageType = {
  Move: "move",
  Jump: "jump",
  Action: "action",
} as const;

export type ActionType = "attack1" | "attack2" | "attack3" | "defendStart" | "defendStop";

export interface ActionMessage {
  type: ActionType;
}
