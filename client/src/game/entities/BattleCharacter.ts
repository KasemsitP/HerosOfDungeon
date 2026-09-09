import Phaser from "phaser";
import { AnimState, PLAYER_HEIGHT } from "@hnd/shared";

const DEFEND_FLASH_MS = 150;

const ANIM_STATE_SUFFIX: Partial<Record<AnimState, string>> = {
  attack1: "attack-1",
  attack2: "attack-2",
  attack3: "attack-3",
  runAttack: "run-attack",
  run: "run",
  walk: "walk",
  jump: "jump",
  protect: "defend",
  hurt: "hurt",
  dead: "dead",
  idle: "idle",
};

// Renders one player's server-authoritative state. This class never decides
// position or HP itself — it only interpolates toward whatever the last
// network update said, and plays a sprite animation per animState.
export class BattleCharacter extends Phaser.Physics.Arcade.Sprite {
  private targetX: number;
  private targetY: number;
  private currentAnim: AnimState = "idle";
  private readonly animPrefix: string;

  constructor(scene: Phaser.Scene, animPrefix: string, x: number, y: number, frameSize = 128) {
    super(scene, x, y, `${animPrefix}-idle`);
    this.animPrefix = animPrefix;
    this.targetX = x;
    this.targetY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false); // position is driven by the server, not local physics
    body.setImmovable(true);
    this.setOrigin(0.5, 1);

    // Sprite sheet frames carry padding around the character; scale the
    // whole frame down so the visible character roughly matches PLAYER_HEIGHT.
    // frameSize varies per class/skin (e.g. ninja's 96px tiles vs 128px elsewhere).
    this.setScale(PLAYER_HEIGHT / frameSize);
    this.play(`${animPrefix}-idle`);
  }

  setNetworkTarget(x: number, y: number, facingLeft: boolean) {
    this.targetX = x;
    this.targetY = y;
    this.setFlipX(facingLeft);
  }

  // Not every class/skin has every animation (ranged classes have no
  // "defend", only knight has "run-attack") -- look the key up and fall back
  // to idle rather than assuming it exists, since AnimState is shared across
  // all classes but each SkinConfig only declares what it actually has.
  applyAnimState(state: AnimState) {
    if (state === this.currentAnim) return;
    this.currentAnim = state;

    if (state === "protect") {
      this.setTint(0x66aaff);
      this.scene.time.delayedCall(DEFEND_FLASH_MS, () => this.setTint(0xffffff));
    }

    const suffix = ANIM_STATE_SUFFIX[state] ?? "idle";
    const key = `${this.animPrefix}-${suffix}`;
    this.play(this.scene.anims.exists(key) ? key : `${this.animPrefix}-idle`);
  }

  // Smoothly closes the gap to the last known server position each frame.
  interpolate(smoothing = 0.35) {
    this.x = Phaser.Math.Linear(this.x, this.targetX, smoothing);
    this.y = Phaser.Math.Linear(this.y, this.targetY, smoothing);
  }

  // Kills any residual interpolation creep immediately -- used when the
  // death sequence starts, since interpolate() runs at real (unscaled) time
  // and isn't affected by anims/tweens/physics timeScale.
  snapToTarget() {
    this.x = this.targetX;
    this.y = this.targetY;
  }
}
