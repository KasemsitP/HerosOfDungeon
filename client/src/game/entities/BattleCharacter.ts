import Phaser from "phaser";
import { AnimState, PLAYER_HEIGHT } from "@hnd/shared";

const SPRITE_FRAME_SIZE = 128;
const DEFEND_FLASH_MS = 150;

// Renders one player's server-authoritative state. This class never decides
// position or HP itself — it only interpolates toward whatever the last
// network update said, and plays a sprite animation (or a tween fallback,
// for sides without pixel art yet) per animState.
export class BattleCharacter extends Phaser.Physics.Arcade.Sprite {
  private targetX: number;
  private targetY: number;
  private currentAnim: AnimState = "idle";
  private readonly animPrefix: string;
  private readonly hasAnimations: boolean;

  constructor(scene: Phaser.Scene, animPrefix: string, x: number, y: number) {
    const hasAnimations = scene.anims.exists(`${animPrefix}-idle`);
    const textureKey = hasAnimations ? `${animPrefix}-idle` : animPrefix;
    super(scene, x, y, textureKey);
    this.animPrefix = animPrefix;
    this.hasAnimations = hasAnimations;
    this.targetX = x;
    this.targetY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false); // position is driven by the server, not local physics
    body.setImmovable(true);
    this.setOrigin(0.5, 1);

    if (hasAnimations) {
      // Sprite sheet frames carry padding around the character; scale the
      // whole frame down so the visible knight roughly matches PLAYER_HEIGHT.
      this.setScale(PLAYER_HEIGHT / SPRITE_FRAME_SIZE);
      this.play(`${animPrefix}-idle`);
    }
  }

  setNetworkTarget(x: number, y: number, facingLeft: boolean) {
    this.targetX = x;
    this.targetY = y;
    this.setFlipX(facingLeft);
  }

  applyAnimState(state: AnimState) {
    if (state === this.currentAnim) return;
    this.currentAnim = state;

    if (this.hasAnimations) {
      this.playSpriteAnim(state);
      return;
    }

    this.applyPlaceholderEffect(state);
  }

  private playSpriteAnim(state: AnimState) {
    switch (state) {
      case "attack1":
        this.play(`${this.animPrefix}-attack-1`);
        break;
      case "attack2":
        this.play(`${this.animPrefix}-attack-2`);
        break;
      case "attack3":
        this.play(`${this.animPrefix}-attack-3`);
        break;
      case "runAttack":
        this.play(`${this.animPrefix}-run-attack`);
        break;
      case "run":
        this.play(`${this.animPrefix}-run`);
        break;
      case "walk":
        this.play(`${this.animPrefix}-walk`);
        break;
      case "jump":
        this.play(`${this.animPrefix}-jump`);
        break;
      case "protect":
        this.play(`${this.animPrefix}-defend`);
        this.setTint(0x66aaff);
        this.scene.time.delayedCall(DEFEND_FLASH_MS, () => this.setTint(0xffffff));
        break;
      case "hurt":
        this.play(`${this.animPrefix}-hurt`);
        break;
      case "dead":
        this.play(`${this.animPrefix}-dead`);
        break;
      case "idle":
      default:
        this.play(`${this.animPrefix}-idle`);
        break;
    }
  }

  // Placeholder-texture fallback for sides without pixel art loaded yet
  // (a colored rectangle, tinted/tweened to hint at the current state).
  private applyPlaceholderEffect(state: AnimState) {
    this.setTint(0xffffff);
    this.setScale(1);
    this.setAlpha(1);

    switch (state) {
      case "attack1":
      case "attack2":
      case "attack3":
      case "runAttack":
        this.scene.tweens.add({ targets: this, scaleX: 1.25, duration: 100, yoyo: true });
        break;
      case "protect":
        this.setTint(0x66aaff);
        this.scene.time.delayedCall(DEFEND_FLASH_MS, () => this.setTint(0xffffff));
        break;
      case "hurt":
        this.setTint(0xff5555);
        this.scene.time.delayedCall(150, () => this.setTint(0xffffff));
        break;
      case "jump":
        this.scene.tweens.add({ targets: this, scaleY: 1.1, duration: 150, yoyo: true });
        break;
      case "dead":
        this.scene.tweens.add({ targets: this, alpha: 0.35, angle: 90, duration: 300 });
        break;
      default:
        break;
    }
  }

  // Smoothly closes the gap to the last known server position each frame.
  interpolate(smoothing = 0.35) {
    this.x = Phaser.Math.Linear(this.x, this.targetX, smoothing);
    this.y = Phaser.Math.Linear(this.y, this.targetY, smoothing);
  }
}
