import Phaser from "phaser";
import { CharacterSkin } from "@hnd/shared";
import { SKIN_CONFIGS } from "../classConfigs";
import { BattleCharacter } from "./BattleCharacter";

// Thin constructor wrapper: looks up frameSize from the skin so callers don't
// have to. Renders any class/skin on either side -- despite the old name
// ("Hero"), there is no side-specific sprite set anymore (see BattleScene's
// spawnCharacter, which uses this for both hero and demon players alike).
export class BattlePlayerSprite extends BattleCharacter {
  constructor(scene: Phaser.Scene, x: number, y: number, skin: CharacterSkin) {
    super(scene, skin, x, y, SKIN_CONFIGS[skin].frameSize);
  }
}
