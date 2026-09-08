import Phaser from "phaser";
import { BattleCharacter } from "./BattleCharacter";

// Swap "hero" for a real spritesheet key + play animations once pixel art is added.
export class Hero extends BattleCharacter {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, "hero", x, y);
  }
}
