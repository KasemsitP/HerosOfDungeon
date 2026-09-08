import Phaser from "phaser";
import { PLAYER_HEIGHT, PLAYER_WIDTH } from "@hnd/shared";
import { Room } from "colyseus.js";
import { BattleStateView } from "../../network/types";

// Hero uses real Knight_1 sprite sheets (128x128 frames) from
// public/assets/sprites/hero/. Demon has no pixel art yet, so it still
// falls back to a colored-rectangle texture in BattleCharacter.
const HERO_ANIMS: Record<string, { file: string; frames: number; frameRate: number; loop: boolean }> = {
  idle: { file: "idle.png", frames: 4, frameRate: 8, loop: true },
  walk: { file: "walk.png", frames: 8, frameRate: 12, loop: true },
  run: { file: "run.png", frames: 7, frameRate: 14, loop: true },
  jump: { file: "jump.png", frames: 6, frameRate: 10, loop: false },
  "attack-1": { file: "attack-1.png", frames: 5, frameRate: 30, loop: false },
  "attack-2": { file: "attack-2.png", frames: 4, frameRate: 26, loop: false },
  "attack-3": { file: "attack-3.png", frames: 4, frameRate: 26, loop: false },
  "run-attack": { file: "run-attack.png", frames: 6, frameRate: 20, loop: false },
  defend: { file: "defend.png", frames: 5, frameRate: 14, loop: false },
  hurt: { file: "hurt.png", frames: 2, frameRate: 12, loop: false },
  dead: { file: "dead.png", frames: 6, frameRate: 8, loop: false },
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    for (const [name, { file }] of Object.entries(HERO_ANIMS)) {
      this.load.spritesheet(`hero-${name}`, `assets/sprites/hero/${file}`, {
        frameWidth: 128,
        frameHeight: 128,
      });
    }
  }

  create(data: { room: Room<BattleStateView> }) {
    this.makeRectTexture("demon", 0xd93a3a);
    this.makeRectTexture("ground", 0x4a3524, 1280, 80);

    this.createHeroAnimations();

    this.scene.start("BattleScene", { room: data.room });
  }

  private createHeroAnimations() {
    for (const [name, { frames, frameRate, loop }] of Object.entries(HERO_ANIMS)) {
      this.anims.create({
        key: `hero-${name}`,
        frames: this.anims.generateFrameNumbers(`hero-${name}`, { start: 0, end: frames - 1 }),
        frameRate,
        repeat: loop ? -1 : 0,
      });
    }
  }

  private makeRectTexture(key: string, color: number, width = PLAYER_WIDTH, height = PLAYER_HEIGHT) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}
