import { CharacterSkin } from "@hnd/shared";

export interface SkinAnimConfig {
  file: string;
  frames: number;
  frameRate: number;
  loop: boolean;
}

export interface SkinConfig {
  frameSize: number; // native px per frame; 96 for ninja, 128 for everything else
  anims: Record<string, SkinAnimConfig>;
}

// Per-skin animation tables, replacing the old Knight-only hardcoded config.
// Every skin folder lives at public/assets/sprites/<skin>/. Frame counts here
// come from measuring the real sprite sheets (not guessed) -- classes differ
// in which states they even have: ranged classes/modes (ninja, wizard,
// samurai-bow) have no "defend", and only knight has "run-attack".
const KNIGHT_ANIMS: Record<string, SkinAnimConfig> = {
  idle: { file: "idle.png", frames: 4, frameRate: 8, loop: true },
  walk: { file: "walk.png", frames: 8, frameRate: 12, loop: true },
  run: { file: "run.png", frames: 7, frameRate: 14, loop: true },
  jump: { file: "jump.png", frames: 6, frameRate: 10, loop: false },
  "attack-1": { file: "attack-1.png", frames: 5, frameRate: 15, loop: false },
  "attack-2": { file: "attack-2.png", frames: 4, frameRate: 26, loop: false },
  "attack-3": { file: "attack-3.png", frames: 4, frameRate: 26, loop: false },
  "run-attack": { file: "run-attack.png", frames: 6, frameRate: 20, loop: false },
  defend: { file: "defend.png", frames: 5, frameRate: 14, loop: false },
  hurt: { file: "hurt.png", frames: 2, frameRate: 12, loop: false },
  dead: { file: "dead.png", frames: 6, frameRate: 8, loop: false },
};

export const SKIN_CONFIGS: Record<CharacterSkin, SkinConfig> = {
  "knight-1": { frameSize: 128, anims: KNIGHT_ANIMS },
  "knight-2": { frameSize: 128, anims: KNIGHT_ANIMS },
  "knight-3": { frameSize: 128, anims: KNIGHT_ANIMS },

  // Ninja_Monk -- throws kunai for all three attacks (ranged), no defend.
  "ninja-1": {
    frameSize: 96,
    anims: {
      idle: { file: "idle.png", frames: 7, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 7, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 9, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 5, frameRate: 15, loop: false },
      "attack-2": { file: "attack-2.png", frames: 5, frameRate: 15, loop: false },
      "attack-3": { file: "attack-3.png", frames: 5, frameRate: 15, loop: false },
      hurt: { file: "hurt.png", frames: 4, frameRate: 12, loop: false },
      dead: { file: "dead.png", frames: 5, frameRate: 8, loop: false },
    },
  },

  // Fire Wizard -- ranged spell casts, no defend. attack-3 reuses Flame_jet
  // (the pack has no Attack_3) sped up to fit the shared ATTACK3_ACTIVE_MS window.
  "wizard-1": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 7, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 6, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 9, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 4, frameRate: 15, loop: false },
      "attack-2": { file: "attack-2.png", frames: 4, frameRate: 15, loop: false },
      "attack-3": { file: "attack-3.png", frames: 14, frameRate: 56, loop: false },
      hurt: { file: "hurt.png", frames: 3, frameRate: 12, loop: false },
      dead: { file: "dead.png", frames: 6, frameRate: 8, loop: false },
    },
  },

  // Samurai, sword mode -- melee, has a real defend pose (Protection.png).
  "samurai-1": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 6, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 9, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 9, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 4, frameRate: 12, loop: false },
      "attack-2": { file: "attack-2.png", frames: 5, frameRate: 26, loop: false },
      "attack-3": { file: "attack-3.png", frames: 4, frameRate: 18, loop: false },
      defend: { file: "defend.png", frames: 2, frameRate: 8, loop: false },
      hurt: { file: "hurt.png", frames: 3, frameRate: 12, loop: false },
      dead: { file: "dead.png", frames: 6, frameRate: 8, loop: false },
    },
  },

  // Kunoichi -- 128px tiles (unlike Ninja_Monk's 96px), no Attack_3 -> Cast.png.
  "ninja-2": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 9, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 8, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 10, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 6, frameRate: 18, loop: false },
      "attack-2": { file: "attack-2.png", frames: 8, frameRate: 40, loop: false },
      "attack-3": { file: "attack-3.png", frames: 6, frameRate: 24, loop: false },
      hurt: { file: "hurt.png", frames: 2, frameRate: 10, loop: false },
      dead: { file: "dead.png", frames: 5, frameRate: 8, loop: false },
    },
  },

  // Ninja_Peasant -- 96px tiles, no Attack_3 -> Shot.png.
  "ninja-3": {
    frameSize: 96,
    anims: {
      idle: { file: "idle.png", frames: 6, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 8, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 6, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 8, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 6, frameRate: 18, loop: false },
      "attack-2": { file: "attack-2.png", frames: 4, frameRate: 20, loop: false },
      "attack-3": { file: "attack-3.png", frames: 6, frameRate: 24, loop: false },
      hurt: { file: "hurt.png", frames: 2, frameRate: 10, loop: false },
      dead: { file: "dead.png", frames: 4, frameRate: 8, loop: false },
    },
  },

  // Lightning Mage -- no Attack_3 -> Light_charge.png (the big channeled beam).
  "wizard-2": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 7, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 7, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 8, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 10, frameRate: 29, loop: false },
      "attack-2": { file: "attack-2.png", frames: 4, frameRate: 20, loop: false },
      "attack-3": { file: "attack-3.png", frames: 13, frameRate: 52, loop: false },
      hurt: { file: "hurt.png", frames: 3, frameRate: 12, loop: false },
      dead: { file: "dead.png", frames: 5, frameRate: 8, loop: false },
    },
  },

  // Wanderer Magican -- no Attack_3 -> Magic_sphere.png (the biggest spell in the pack).
  "wizard-3": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 8, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 7, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 8, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 7, frameRate: 20, loop: false },
      "attack-2": { file: "attack-2.png", frames: 9, frameRate: 45, loop: false },
      "attack-3": { file: "attack-3.png", frames: 16, frameRate: 60, loop: false },
      hurt: { file: "hurt.png", frames: 4, frameRate: 12, loop: false },
      dead: { file: "dead.png", frames: 4, frameRate: 8, loop: false },
    },
  },

  // Samurai_Commander -- has a real Attack_3 + Protect, unlike the base Samurai skin's timing quirks.
  "samurai-2": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 5, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 9, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 7, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 4, frameRate: 12, loop: false },
      "attack-2": { file: "attack-2.png", frames: 5, frameRate: 26, loop: false },
      "attack-3": { file: "attack-3.png", frames: 4, frameRate: 18, loop: false },
      defend: { file: "defend.png", frames: 2, frameRate: 8, loop: false },
      hurt: { file: "hurt.png", frames: 2, frameRate: 10, loop: false },
      dead: { file: "dead.png", frames: 6, frameRate: 8, loop: false },
    },
  },

  // Samurai_Archer -- bow mode, a fully separate sprite set. Ranged, no defend.
  "samurai-bow": {
    frameSize: 128,
    anims: {
      idle: { file: "idle.png", frames: 9, frameRate: 8, loop: true },
      walk: { file: "walk.png", frames: 8, frameRate: 12, loop: true },
      run: { file: "run.png", frames: 8, frameRate: 14, loop: true },
      jump: { file: "jump.png", frames: 9, frameRate: 10, loop: false },
      "attack-1": { file: "attack-1.png", frames: 5, frameRate: 15, loop: false },
      "attack-2": { file: "attack-2.png", frames: 5, frameRate: 26, loop: false },
      "attack-3": { file: "attack-3.png", frames: 6, frameRate: 26, loop: false },
      hurt: { file: "hurt.png", frames: 3, frameRate: 12, loop: false },
      dead: { file: "dead.png", frames: 5, frameRate: 8, loop: false },
    },
  },
};
