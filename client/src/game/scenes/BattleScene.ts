import Phaser from "phaser";
import { Room } from "colyseus.js";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  DEATH_SEQUENCE_MS,
  getAttackMode,
  GROUND_Y,
  HitAttackType,
  HitEventMessage,
  HIT_EVENT,
  MessageType,
  resolveRenderSkin,
} from "@hnd/shared";
import { BattleStateView, PlayerView, ProjectileView } from "../../network/types";
import { actionBus } from "../../network/actionBus";
import { deathBus } from "../../network/deathBus";
import { BattleCharacter } from "../entities/BattleCharacter";
import { BattlePlayerSprite } from "../entities/BattlePlayerSprite";
import { Projectile } from "../entities/Projectile";
import { InputController } from "../input/InputController";
import { SoundManager } from "../audio/SoundManager";

const DEATH_SLOWMO_SCALE = 0.25;
const DEATH_SHAKE_MS = 150;
const DEATH_ZOOM_IN = 1.3;
const DEATH_ZOOM_MS = 1800;
const DEATH_ZOOM_OUT_MS = 500;

const HIT_STOP_MS = 80;
const HIT_STOP_SCALE = 0.05;
// Hits can land faster than HIT_STOP_MS apart (attack1's cooldown alone is
// 400ms, and both players' hits broadcast to both clients), so without a
// floor between triggers each new hit re-arms globalTimeScale before the
// previous one resets -- during a real exchange it stays pinned near 0
// almost continuously, which reads as the walk/run animation (and by
// extension, movement) being stuck. This guarantees real recovery time
// between freezes even in a fast flurry.
const HIT_STOP_MIN_GAP_MS = 150;
const HIT_SHAKE_MS = 80;
const HIT_SHAKE_INTENSITY = 0.005;
const SPRITE_FLASH_MS = 100;
const DAMAGE_NUMBER_RISE_PX = 30;
const DAMAGE_NUMBER_DURATION_MS = 800;
const FOOTSTEP_INTERVAL_MS = 320;

export class BattleScene extends Phaser.Scene {
  private room!: Room<BattleStateView>;
  private soundManager!: SoundManager;
  private characters = new Map<string, BattleCharacter>();
  private renderSkins = new Map<string, string>(); // sessionId -> last rendered skin, to detect weapon-switch texture swaps
  private projectiles = new Map<string, Projectile>();
  private input_!: InputController;
  private lastSentDir: -1 | 0 | 1 = 0;
  private wasDefending = false;
  private inputLocked = false;
  private deathSequenceStarted = false;
  private lastHitStopAt = 0;

  constructor() {
    super("BattleScene");
  }

  init(data: { room: Room<BattleStateView> }) {
    this.room = data.room;
  }

  create() {
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.createBackground();
    this.add.image(ARENA_WIDTH / 2, GROUND_Y + 40, "ground");

    this.input_ = new InputController(this.input.keyboard!);

    this.soundManager = new SoundManager(this);
    this.soundManager.playMusic("music-battle");
    this.events.once("shutdown", () => this.soundManager.destroy());

    this.room.onMessage(HIT_EVENT, (data: HitEventMessage) => this.handleHitEvent(data));

    // Simple periodic check rather than trying to sync exactly to walk/run
    // animation frames -- good enough for footstep cadence, much less
    // machinery than frame-accurate foot-plant events would need.
    this.time.addEvent({
      delay: FOOTSTEP_INTERVAL_MS,
      loop: true,
      callback: () => {
        const me = this.room.state.players.get(this.room.sessionId);
        if (me && me.hp > 0 && (me.animState === "walk" || me.animState === "run")) {
          this.soundManager.playFootstep();
        }
      },
    });

    this.room.state.players.onAdd((player: PlayerView, sessionId: string) => {
      this.spawnCharacter(player, sessionId);

      player.onChange(() => {
        const renderSkin = resolveRenderSkin(player.characterClass, player.skin, player.weaponType);
        if (this.renderSkins.get(sessionId) !== renderSkin) {
          // Weapon switch (or any skin change) swaps the whole sprite set --
          // BattleCharacter's animPrefix is fixed at construction, so recreate it.
          this.characters.get(sessionId)?.destroy();
          this.spawnCharacter(player, sessionId);
          return;
        }
        const sprite = this.characters.get(sessionId);
        if (!sprite) return;
        sprite.setNetworkTarget(player.x, player.y, player.facingLeft);
        sprite.applyAnimState(player.animState);

        if (player.animState === "dead" && !this.deathSequenceStarted) {
          this.deathSequenceStarted = true;
          this.startDeathSequence();
        }
      });
    });

    this.room.state.players.onRemove((_player: PlayerView, sessionId: string) => {
      this.characters.get(sessionId)?.destroy();
      this.characters.delete(sessionId);
      this.renderSkins.delete(sessionId);
    });

    this.room.state.projectiles.onAdd((projectile: ProjectileView, id: string) => {
      const sprite = new Projectile(this, projectile.x, projectile.y, projectile.vx, projectile.projectileType);
      this.projectiles.set(id, sprite);

      projectile.onChange(() => {
        this.projectiles.get(id)?.setNetworkTarget(projectile.x, projectile.y);
      });
    });

    this.room.state.projectiles.onRemove((_projectile: ProjectileView, id: string) => {
      this.projectiles.get(id)?.destroy();
      this.projectiles.delete(id);
    });
  }

  // 4-layer parallax (sky -> mountains -> trees -> ground), matching the
  // original Java game's layout. scrollFactor differences only become
  // visible once the camera actually pans/shakes (e.g. on a hit) -- the
  // static 1v1 camera today shows them at rest, which is still correct, just
  // undramatic until a camera-shake effect is added later.
  private createBackground() {
    this.add.image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, "bg-sky").setScrollFactor(0);

    this.add
      .tileSprite(0, ARENA_HEIGHT - 200, ARENA_WIDTH, 170, "bg-mountains")
      .setOrigin(0, 0)
      .setScrollFactor(0.1);

    this.add
      .tileSprite(0, ARENA_HEIGHT - 110, ARENA_WIDTH, 110, "bg-trees")
      .setOrigin(0, 0)
      .setScrollFactor(0.4);
  }

  // Rendering is keyed by the player's class/skin, not their side -- "hero"
  // vs "demon" is just which team spawns on which edge of the arena, not a
  // human/monster look. Every class has real art now, so both sides use the
  // same sprite-based path.
  private spawnCharacter(player: PlayerView, sessionId: string) {
    const renderSkin = resolveRenderSkin(player.characterClass, player.skin, player.weaponType);
    const character = new BattlePlayerSprite(this, player.x, player.y, renderSkin);
    character.setNetworkTarget(player.x, player.y, player.facingLeft);
    character.applyAnimState(player.animState);
    this.characters.set(sessionId, character);
    this.renderSkins.set(sessionId, renderSkin);
  }

  // One-off broadcast from BattleRoom.resolveHit (see HIT_EVENT in
  // shared/types.ts) -- everything here is presentation-only, no state
  // changes. Skip the little hit-stop/shake when the hit was lethal: the
  // death sequence (startDeathSequence, triggered separately via the
  // player's animState flipping to "dead") owns the cinematic from here,
  // and competing timeScale/shake calls would just fight each other.
  private handleHitEvent(data: HitEventMessage) {
    if (data.targetDied) {
      this.soundManager.playDeath();
    } else {
      this.soundManager.playHit(data.wasBlocked);
    }
    this.spawnDamageNumber(data.x, data.y, data.damage, data.wasBlocked, data.attackType);
    this.flashSpriteTint(data.targetId);

    if (!data.targetDied && this.applyHitStop()) {
      this.cameras.main.shake(HIT_SHAKE_MS, HIT_SHAKE_INTENSITY);
    }
  }

  private spawnDamageNumber(x: number, y: number, damage: number, wasBlocked: boolean, attackType: HitAttackType) {
    const isBigSkill = attackType === "attack2" || attackType === "attack3";
    const text = this.add
      .text(x, y - 40, `${damage}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: isBigSkill ? "22px" : "16px",
        color: wasBlocked ? "#7ec8ff" : "#ffffff", // blocked = light blue (damage was reduced), unblocked = white
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(50);

    this.tweens.add({
      targets: text,
      y: y - 40 - DAMAGE_NUMBER_RISE_PX,
      alpha: 0,
      duration: DAMAGE_NUMBER_DURATION_MS,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  // Brief freeze-frame on a landed hit -- much shorter/lighter than the 5s
  // death slowmo (startDeathSequence), which happens once per match instead
  // of on every hit. Plain setTimeout, not this.time.delayedCall, for the
  // same reason startDeathSequence uses one: independent of any in-scene
  // timeScale. Guarded by deathSequenceStarted on both ends so a hit that
  // happens to land right as the death sequence kicks in can't have its
  // resolve-after-80ms callback stomp globalTimeScale back to 1 mid-cinematic.
  //
  // Throttled by HIT_STOP_MIN_GAP_MS (see its declaration) -- hits can land
  // faster than this freeze resolves, and without a floor between triggers
  // each new hit re-arms globalTimeScale before the last one clears, so it
  // stays pinned near 0 for as long as combat stays fast, which looks (and
  // plays) like movement/animation is stuck. Returns whether it actually
  // fired, so callers (e.g. the camera shake in handleHitEvent) can skip
  // their own effect too instead of spamming independently of this gate.
  private applyHitStop(): boolean {
    if (this.deathSequenceStarted) return false;
    const now = Date.now();
    if (now - this.lastHitStopAt < HIT_STOP_MIN_GAP_MS) return false;
    this.lastHitStopAt = now;

    this.anims.globalTimeScale = HIT_STOP_SCALE;
    setTimeout(() => {
      if (this.deathSequenceStarted) return;
      this.anims.globalTimeScale = 1;
    }, HIT_STOP_MS);
    return true;
  }

  private flashSpriteTint(targetId: string) {
    const sprite = this.characters.get(targetId);
    if (!sprite) return;
    sprite.setTintFill(0xffffff);
    setTimeout(() => sprite.clearTint(), SPRITE_FLASH_MS);
  }

  update() {
    this.characters.forEach((character) => character.interpolate());
    this.projectiles.forEach((projectile) => projectile.interpolate());
    this.readInput();
  }

  // Cinematic beat on a kill, before ResultScreen. Phaser owns everything
  // inside the canvas (shake/slowmo/zoom); see deathBus for how it signals
  // completion back to React, which owns the overlay + navigation.
  private startDeathSequence() {
    this.inputLocked = true; // stop processing input locally; don't wait for the server to start rejecting it

    // Our characters/projectiles move via a manual per-frame lerp in
    // interpolate(), not Arcade Physics velocity -- so physics.world.timeScale
    // doesn't slow that down. The match has already ended server-side (no
    // more position updates coming), so this just kills the last bit of
    // lerp creep instead of leaving it to asymptotically settle.
    this.characters.forEach((c) => c.snapToTarget());
    this.projectiles.forEach((p) => p.snapToTarget());

    this.cameras.main.shake(DEATH_SHAKE_MS, 0.01);

    this.anims.globalTimeScale = DEATH_SLOWMO_SCALE;
    this.tweens.timeScale = DEATH_SLOWMO_SCALE;
    this.physics.world.timeScale = DEATH_SLOWMO_SCALE;

    const positions = [...this.characters.values()];
    const midX = positions.length ? positions.reduce((sum, c) => sum + c.x, 0) / positions.length : ARENA_WIDTH / 2;
    const midY = positions.length ? positions.reduce((sum, c) => sum + c.y, 0) / positions.length : GROUND_Y;
    this.cameras.main.centerOn(midX, midY);
    this.cameras.main.zoomTo(DEATH_ZOOM_IN, DEATH_ZOOM_MS, "Sine.easeInOut");

    // Plain setTimeout, deliberately not this.time.delayedCall -- the latter
    // is driven by this.time, which time.timeScale (a *different* knob than
    // the ones set above, e.g. a future pause menu) could stretch
    // unintentionally. This 5s is real wall-clock time, independent of any
    // in-scene timeScale.
    setTimeout(() => {
      this.anims.globalTimeScale = 1;
      this.tweens.timeScale = 1;
      this.physics.world.timeScale = 1;
      this.cameras.main.zoomTo(1, DEATH_ZOOM_OUT_MS);
      deathBus.emitComplete();
    }, DEATH_SEQUENCE_MS);
  }

  private readInput() {
    if (this.inputLocked || this.room.state.status !== "playing") return;

    const snapshot = this.input_.read();

    if (snapshot.moveDir !== this.lastSentDir) {
      this.lastSentDir = snapshot.moveDir;
      this.room.send(MessageType.Move, { dir: snapshot.moveDir });
    }

    if (snapshot.jumpPressed) {
      this.room.send(MessageType.Jump);
      this.soundManager.playJump();
    }

    if (snapshot.attack1Pressed) this.sendAction("attack1");
    if (snapshot.attack2Pressed) this.sendAction("attack2");
    if (snapshot.attack3Pressed) this.sendAction("attack3");

    if (snapshot.defendHeld !== this.wasDefending) {
      this.wasDefending = snapshot.defendHeld;
      this.room.send(MessageType.Action, { type: snapshot.defendHeld ? "defendStart" : "defendStop" });
    }

    if (snapshot.switchWeaponPressed) {
      this.room.send(MessageType.SwitchWeapon);
    }
  }

  private sendAction(type: "attack1" | "attack2" | "attack3") {
    this.room.send(MessageType.Action, { type });
    actionBus.emit(type);

    // Optimistic swing/cast sound, played immediately on input rather than
    // waiting for a server round-trip -- whether it actually lands (and
    // what it hits) is a separate sound, played from handleHitEvent instead.
    // We can't know here if this attack1 will resolve as a run-attack
    // (server derives "running" itself, isn't synced to the client), so it's
    // just grouped with plain attack1 for this anticipatory sound only.
    const me = this.room.state.players.get(this.room.sessionId);
    if (!me) return;
    if (getAttackMode(me.characterClass, me.weaponType) === "ranged") {
      if (me.characterClass === "samurai") this.soundManager.playBowRelease();
      else this.soundManager.playCast();
    } else {
      this.soundManager.playSwing(type);
    }
  }
}
