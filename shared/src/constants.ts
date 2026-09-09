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
export const ATTACK1_COOLDOWN_MS = 400;
export const ATTACK1_ACTIVE_MS = 350; // >= the real 5-frame @ 15fps animation (~333ms), plus tick-jitter margin

export const ATTACK2_DAMAGE = 90;
export const ATTACK2_RANGE = 110;
export const ATTACK2_COOLDOWN_MS = 3000;
export const ATTACK2_ACTIVE_MS = 200;

export const ATTACK3_DAMAGE = 150;
export const ATTACK3_RANGE = 140;
export const ATTACK3_COOLDOWN_MS = 6000;
export const ATTACK3_ACTIVE_MS = 250;

export const RUN_ATTACK_KNOCKBACK_VX = 700; // px/s impulse applied to the victim
export const RUN_ATTACK_ACTIVE_MS = 300; // matches the run-attack sprite: 6 frames @ 20fps

export const DEFEND_DAMAGE_MULTIPLIER = 0.3; // incoming damage * this while the target is defending

export const SHIELD_MAX_DURABILITY = 100;
export const SHIELD_BREAK_COOLDOWN_MS = 5000;

export const KNOCKBACK_FORCE_HIT = 500; // px/s impulse, unblocked hit
export const KNOCKBACK_FORCE_BLOCK = 200; // px/s impulse, successful block (40% of HIT)
export const KNOCKBACK_FRICTION = 2400; // px/s^2 deceleration applied every tick
export const KNOCKBACK_STOP_THRESHOLD = 20; // px/s -- below this, the impulse is cleared

export const PROJECTILE_SPEED = 700; // px/s
export const PROJECTILE_MAX_LIFETIME_MS = 2000;
export const PROJECTILE_HIT_RADIUS = 20; // added to player half-width/height for collision

export const WEAPON_SWITCH_LOCKOUT_MS = 300;

export const MATCH_DURATION_SECONDS = 60;
export const SERVER_TICK_RATE_HZ = 20;
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE_HZ;

export const ROOM_NAME = "battle";
export const PRACTICE_ROOM_NAME = "practice";
export const PRIVATE_ROOM_NAME = "private-battle";

export const RECONNECT_GRACE_SECONDS = 15;

export const DEATH_SEQUENCE_MS = 5000; // client-only cinematic slowmo before navigating to ResultScreen

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I -- easy to read aloud/type
export const ROOM_CODE_TTL_MS = 10 * 60 * 1000;

export const SPAWN_X = {
  hero: 200,
  demon: ARENA_WIDTH - 200,
} as const;
