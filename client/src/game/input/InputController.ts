import Phaser from "phaser";

export interface InputSnapshot {
  moveDir: -1 | 0 | 1;
  jumpPressed: boolean;
  attack1Pressed: boolean;
  attack2Pressed: boolean;
  attack3Pressed: boolean;
  defendHeld: boolean;
  switchWeaponPressed: boolean;
}

// Pure input *detection* — polls which keys are down/just-pressed each frame
// and hands back a snapshot. Knows nothing about Colyseus or the room; the
// caller (BattleScene) decides what to send over the network from this.
export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private attack1Key: Phaser.Input.Keyboard.Key;
  private attack2Key: Phaser.Input.Keyboard.Key;
  private attack3Key: Phaser.Input.Keyboard.Key;
  private shiftKey: Phaser.Input.Keyboard.Key;
  private switchWeaponKey: Phaser.Input.Keyboard.Key;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.cursors = keyboard.createCursorKeys();
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.spaceKey = keyboard.addKey(KeyCodes.SPACE);
    this.attack1Key = keyboard.addKey(KeyCodes.Z);
    this.attack2Key = keyboard.addKey(KeyCodes.X);
    this.attack3Key = keyboard.addKey(KeyCodes.C);
    this.shiftKey = keyboard.addKey(KeyCodes.SHIFT);
    this.switchWeaponKey = keyboard.addKey(KeyCodes.V);
  }

  read(): InputSnapshot {
    let moveDir: -1 | 0 | 1 = 0;
    if (this.cursors.left?.isDown) moveDir = -1;
    else if (this.cursors.right?.isDown) moveDir = 1;

    return {
      moveDir,
      jumpPressed:
        Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.spaceKey),
      attack1Pressed: Phaser.Input.Keyboard.JustDown(this.attack1Key),
      attack2Pressed: Phaser.Input.Keyboard.JustDown(this.attack2Key),
      attack3Pressed: Phaser.Input.Keyboard.JustDown(this.attack3Key),
      defendHeld: Boolean(this.cursors.down?.isDown) || this.shiftKey.isDown,
      switchWeaponPressed: Phaser.Input.Keyboard.JustDown(this.switchWeaponKey),
    };
  }
}
