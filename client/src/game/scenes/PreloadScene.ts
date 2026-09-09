import Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH } from "@hnd/shared";
import { Room } from "colyseus.js";
import { BattleStateView } from "../../network/types";
import { SKIN_CONFIGS } from "../classConfigs";

// Path -> Phaser cache key for every battle-scene sound (see
// client/public/assets/audio/README.txt for which of these actually exist
// as files right now). A missing file just 404s and Phaser skips it, so
// SoundManager's cache.audio.exists() guards make every play() call a
// silent no-op until the real file is added.
const SFX_FILES: Record<string, string> = {
  "sfx-hit": "hit.mp3",
  "sfx-hit-blocked": "hit-blocked.mp3",
  "sfx-swing-light": "swing-light.mp3",
  "sfx-swing-heavy": "swing-heavy.mp3",
  "sfx-cast": "cast.mp3",
  "sfx-bow-release": "bow-release.mp3",
  "sfx-jump": "jump.mp3",
  "sfx-footstep": "footstep.mp3",
  "sfx-death": "death.mp3", // played on a killing blow instead of sfx-hit -- see BattleScene.handleHitEvent
};

const MUSIC_FILES: Record<string, string> = {
  "music-battle": "battle.mp3",
};

// Demon has no pixel art yet, so it still falls back to a colored-rectangle
// texture in BattleCharacter. Every playable class/skin's real sprite sheets
// are loaded generically from SKIN_CONFIGS below.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    for (const [skin, config] of Object.entries(SKIN_CONFIGS)) {
      for (const [name, { file }] of Object.entries(config.anims)) {
        this.load.spritesheet(`${skin}-${name}`, `assets/sprites/${skin}/${file}`, {
          frameWidth: config.frameSize,
          frameHeight: config.frameSize,
        });
      }
    }

    this.load.spritesheet("projectile-kunai", "assets/sprites/ninja-1/kunai.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("projectile-arrow", "assets/sprites/samurai-bow/arrow.png");

    for (const [key, file] of Object.entries(SFX_FILES)) {
      this.load.audio(key, `assets/audio/sfx/${file}`);
    }
    for (const [key, file] of Object.entries(MUSIC_FILES)) {
      this.load.audio(key, `assets/audio/music/${file}`);
    }
  }

  create() {
    this.makeRectTexture("ground", 0x4a3524, 1280, 80);
    this.makeCircleTexture("projectile-bolt", 0xff8c3c, 10);
    this.makeBackgroundTextures();

    this.createSkinAnimations();
    this.createProjectileAnimations();

    const room = this.registry.get("room") as Room<BattleStateView>;
    this.scene.start("BattleScene", { room });
  }

  private createSkinAnimations() {
    for (const [skin, config] of Object.entries(SKIN_CONFIGS)) {
      for (const [name, { frames, frameRate, loop }] of Object.entries(config.anims)) {
        this.anims.create({
          key: `${skin}-${name}`,
          frames: this.anims.generateFrameNumbers(`${skin}-${name}`, { start: 0, end: frames - 1 }),
          frameRate,
          repeat: loop ? -1 : 0,
        });
      }
    }
  }

  private createProjectileAnimations() {
    this.anims.create({
      key: "projectile-kunai-spin",
      frames: this.anims.generateFrameNumbers("projectile-kunai", { start: 0, end: 2 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  private makeRectTexture(key: string, color: number, width = PLAYER_WIDTH, height = PLAYER_HEIGHT) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private makeCircleTexture(key: string, color: number, radius: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  // Placeholder parallax layers -- no real art exists yet (no Kenney/itch.io
  // pack has been added), so these are generated shapes in the same spot a
  // real sky.png/mountains.png/trees.png would load from. Swappable later by
  // replacing these three methods with this.load.image() calls in preload().
  private makeBackgroundTextures() {
    this.makeSkyTexture();
    this.makeMountainsTexture();
    this.makeTreesTexture();
  }

  private makeSkyTexture() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x2a1c47, 0x2a1c47, 0x6b4a8f, 0x6b4a8f, 1);
    g.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    g.generateTexture("bg-sky", ARENA_WIDTH, ARENA_HEIGHT);
    g.destroy();
  }

  private makeMountainsTexture() {
    const w = 320;
    const h = 170;
    const g = this.add.graphics();
    g.fillStyle(0x2a1f45, 1);
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(40, 70);
    g.lineTo(90, 110);
    g.lineTo(150, 30);
    g.lineTo(210, 95);
    g.lineTo(260, 55);
    g.lineTo(w, h);
    g.closePath();
    g.fillPath();
    g.generateTexture("bg-mountains", w, h);
    g.destroy();
  }

  private makeTreesTexture() {
    const w = 220;
    const h = 110;
    const g = this.add.graphics();
    g.fillStyle(0x14101f, 1);
    for (let i = 0; i < 4; i++) {
      const x = i * 55 + 24;
      g.fillTriangle(x, h - 15, x - 22, h - 70, x + 22, h - 70);
      g.fillRect(x - 4, h - 25, 8, 25);
    }
    g.generateTexture("bg-trees", w, h);
    g.destroy();
  }
}
