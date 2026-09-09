import Phaser from "phaser";
import { HitAttackType } from "@hnd/shared";
import { readMuted } from "../../audio/muteStorage";
import { muteBus } from "../../network/muteBus";

const MUSIC_FADE_MS = 500;
const MUSIC_VOLUME = 0.45;
const SFX_VOLUME = 0.6;
// Safety cap on SFX playback, not just cosmetic -- a sourced clip can turn
// out much longer than a quick hit/swing sound should be (e.g. an 8s file
// where 1-2s was intended). Attacks fire as often as every ~400ms
// (ATTACK1_COOLDOWN_MS), so an overlong clip stacks into overlapping sound
// instead of the punchy one-shot it's meant to be. Doesn't apply to music,
// which should play its full length.
const SFX_MAX_DURATION_MS = 2500;

// Wraps Phaser's own Sound Manager for everything that happens inside the
// battle world -- SFX triggered by hitEvent/input, and the battle music
// loop. UI sound (menu clicks, modals) is a separate, React-owned concern
// (useUISound.ts) since that whole layer is plain DOM, not Phaser; the only
// thing the two audio systems share is the mute flag, synced via muteBus so
// a toggle in the React HUD silences already-playing Phaser audio
// immediately instead of only taking effect on the next scene boot.
//
// Every play call is guarded by cache.audio.exists() -- SFX/music files
// aren't part of this repo yet (see client/public/assets/audio/README), so
// until they're added every call here is a harmless no-op rather than a
// Phaser exception.
export class SoundManager {
  private scene: Phaser.Scene;
  private music?: Phaser.Sound.BaseSound & { key: string };
  private unsubscribeMute?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.scene.sound.mute = readMuted();
    this.unsubscribeMute = muteBus.subscribe((muted) => {
      this.scene.sound.mute = muted;
    });
  }

  destroy() {
    this.unsubscribeMute?.();
    this.music?.stop();
  }

  playHit(wasBlocked: boolean) {
    this.playSfx(wasBlocked ? "sfx-hit-blocked" : "sfx-hit");
  }

  // Played instead of playHit() for a killing blow -- see BattleScene.handleHitEvent.
  playDeath() {
    this.playSfx("sfx-death");
  }

  playSwing(attackType: HitAttackType) {
    this.playSfx(attackType === "attack1" || attackType === "runAttack" ? "sfx-swing-light" : "sfx-swing-heavy");
  }

  playCast() {
    this.playSfx("sfx-cast");
  }

  playBowRelease() {
    this.playSfx("sfx-bow-release");
  }

  playJump() {
    this.playSfx("sfx-jump");
  }

  playFootstep() {
    this.playSfx("sfx-footstep");
  }

  // Crossfades into `key` if it isn't already the current track -- fades
  // the outgoing loop out and the incoming one in over MUSIC_FADE_MS rather
  // than a hard cut, per spec.
  playMusic(key: string) {
    if (this.music?.key === key) return;
    if (!this.scene.cache.audio.exists(key)) return;

    const outgoing = this.music;
    const incoming = this.scene.sound.add(key, { loop: true, volume: 0 }) as Phaser.Sound.BaseSound & { key: string };
    incoming.play();
    this.scene.tweens.add({ targets: incoming, volume: MUSIC_VOLUME, duration: MUSIC_FADE_MS });
    this.music = incoming;

    if (outgoing) {
      this.scene.tweens.add({
        targets: outgoing,
        volume: 0,
        duration: MUSIC_FADE_MS,
        onComplete: () => outgoing.stop(),
      });
    }
  }

  stopMusic() {
    const current = this.music;
    if (!current) return;
    this.music = undefined;
    this.scene.tweens.add({
      targets: current,
      volume: 0,
      duration: MUSIC_FADE_MS,
      onComplete: () => current.stop(),
    });
  }

  private playSfx(key: string) {
    if (!this.scene.cache.audio.exists(key)) return;

    // Not this.scene.sound.play() (the fire-and-forget convenience method)
    // because that gives back no handle to cut playback short -- add() +
    // play() keeps one so the SFX_MAX_DURATION_MS cap below can enforce itself.
    const sound = this.scene.sound.add(key, { volume: SFX_VOLUME });
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      sound.destroy();
    };

    sound.once("complete", cleanup); // finished naturally before the cap -- clean up immediately
    sound.play();
    setTimeout(() => {
      if (cleaned) return; // already finished + cleaned up naturally
      sound.stop();
      cleanup();
    }, SFX_MAX_DURATION_MS);
  }
}
