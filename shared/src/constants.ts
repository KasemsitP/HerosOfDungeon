// Values shared by client (prediction/rendering) and server (authoritative simulation).
// Server is the source of truth; client must treat these as read-only display/prediction hints.

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 480;
export const GROUND_Y = 400;

export const GRAVITY = 1400; // px/s^2
export const MOVE_SPEED = 260; // px/s
export const JUMP_VELOCITY = -620; // px/s

export const PLAYER_WIDTH = 64;
export const PLAYER_HEIGHT = 96;

export const MAX_HP = 700;

export const RUN_HOLD_MS = 200; // how long a direction must be held before it becomes a run
export const RUN_SPEED_MULTIPLIER = 1.6;

// Per-skill damage/range/cooldown/active-window (px measured from player center in facing direction).
export const ATTACK1_DAMAGE = 50;
export const ATTACK1_RANGE = 90;
export const ATTACK1_COOLDOWN_MS = 300;
export const ATTACK1_ACTIVE_MS = 150;

export const ATTACK2_DAMAGE = 90;
export const ATTACK2_RANGE = 110;
export const ATTACK2_COOLDOWN_MS = 3000;
export const ATTACK2_ACTIVE_MS = 200;

export const ATTACK3_DAMAGE = 150;
export const ATTACK3_RANGE = 140;
export const ATTACK3_COOLDOWN_MS = 6000;
export const ATTACK3_ACTIVE_MS = 250;

export const RUN_ATTACK_KNOCKBACK_VX = 700; // px/s impulse applied to the victim
export const RUN_ATTACK_KNOCKBACK_MS = 250;

export const DEFEND_DAMAGE_MULTIPLIER = 0.3; // incoming damage * this while the target is defending

export const MATCH_DURATION_SECONDS = 60;
export const SERVER_TICK_RATE_HZ = 20;
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE_HZ;

export const ROOM_NAME = "battle";
export const PRACTICE_ROOM_NAME = "practice";

export const SPAWN_X = {
  hero: 200,
  demon: ARENA_WIDTH - 200,
} as const;
