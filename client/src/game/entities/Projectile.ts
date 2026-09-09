import Phaser from "phaser";

const TEXTURE_BY_TYPE: Record<"kunai" | "arrow" | "bolt", string> = {
  kunai: "projectile-kunai",
  arrow: "projectile-arrow",
  bolt: "projectile-bolt",
};

// Much simpler than BattleCharacter -- no animState/priority cascade, just a
// small sprite that interpolates toward the server's last reported position.
export class Projectile extends Phaser.GameObjects.Sprite {
  private targetX: number;
  private targetY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, projectileType: "kunai" | "arrow" | "bolt") {
    super(scene, x, y, TEXTURE_BY_TYPE[projectileType]);
    this.targetX = x;
    this.targetY = y;
    scene.add.existing(this);

    if (projectileType === "kunai") {
      this.play("projectile-kunai-spin");
    } else {
      this.setFlipX(vx < 0);
    }
  }

  setNetworkTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  interpolate(smoothing = 0.5) {
    this.x = Phaser.Math.Linear(this.x, this.targetX, smoothing);
    this.y = Phaser.Math.Linear(this.y, this.targetY, smoothing);
  }

  snapToTarget() {
    this.x = this.targetX;
    this.y = this.targetY;
  }
}
