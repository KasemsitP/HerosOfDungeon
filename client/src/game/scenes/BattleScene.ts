import Phaser from "phaser";
import { Room } from "colyseus.js";
import { ARENA_HEIGHT, ARENA_WIDTH, GROUND_Y, MessageType } from "@hnd/shared";
import { BattleStateView, PlayerView } from "../../network/types";
import { actionBus } from "../../network/actionBus";
import { BattleCharacter } from "../entities/BattleCharacter";
import { Hero } from "../entities/Hero";
import { Demon } from "../entities/Demon";
import { InputController } from "../input/InputController";

export class BattleScene extends Phaser.Scene {
  private room!: Room<BattleStateView>;
  private characters = new Map<string, BattleCharacter>();
  private input_!: InputController;
  private lastSentDir: -1 | 0 | 1 = 0;
  private wasDefending = false;

  constructor() {
    super("BattleScene");
  }

  init(data: { room: Room<BattleStateView> }) {
    this.room = data.room;
  }

  create() {
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.add.image(ARENA_WIDTH / 2, GROUND_Y + 40, "ground");
    this.cameras.main.setBackgroundColor("#1b1f2a");

    this.input_ = new InputController(this.input.keyboard!);

    this.room.state.players.onAdd((player: PlayerView, sessionId: string) => {
      const character =
        player.side === "hero"
          ? new Hero(this, player.x, player.y)
          : new Demon(this, player.x, player.y);
      character.setNetworkTarget(player.x, player.y, player.facingLeft);
      character.applyAnimState(player.animState);
      this.characters.set(sessionId, character);

      player.onChange(() => {
        const sprite = this.characters.get(sessionId);
        if (!sprite) return;
        sprite.setNetworkTarget(player.x, player.y, player.facingLeft);
        sprite.applyAnimState(player.animState);
      });
    });

    this.room.state.players.onRemove((_player: PlayerView, sessionId: string) => {
      this.characters.get(sessionId)?.destroy();
      this.characters.delete(sessionId);
    });
  }

  update() {
    this.characters.forEach((character) => character.interpolate());
    this.readInput();
  }

  private readInput() {
    if (this.room.state.status !== "playing") return;

    const snapshot = this.input_.read();

    if (snapshot.moveDir !== this.lastSentDir) {
      this.lastSentDir = snapshot.moveDir;
      this.room.send(MessageType.Move, { dir: snapshot.moveDir });
    }

    if (snapshot.jumpPressed) {
      this.room.send(MessageType.Jump);
    }

    if (snapshot.attack1Pressed) this.sendAction("attack1");
    if (snapshot.attack2Pressed) this.sendAction("attack2");
    if (snapshot.attack3Pressed) this.sendAction("attack3");

    if (snapshot.defendHeld !== this.wasDefending) {
      this.wasDefending = snapshot.defendHeld;
      this.room.send(MessageType.Action, { type: snapshot.defendHeld ? "defendStart" : "defendStop" });
    }
  }

  private sendAction(type: "attack1" | "attack2" | "attack3") {
    this.room.send(MessageType.Action, { type });
    actionBus.emit(type);
  }
}
