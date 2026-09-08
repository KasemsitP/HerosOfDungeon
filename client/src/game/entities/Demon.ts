import Phaser from "phaser";
import { BattleCharacter } from "./BattleCharacter";

// Swap "demon" for a real spritesheet key + play animations once pixel art is added.
export class Demon extends BattleCharacter {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, "demon", x, y);
  }
}
