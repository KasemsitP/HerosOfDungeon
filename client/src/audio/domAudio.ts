import { readMuted } from "./muteStorage";

// Plain HTML5 Audio, for the parts of the app that are pure React DOM (menu
// music, UI clicks, the result-screen jingle) -- these never touch Phaser,
// so there's no reason to route them through the Phaser Sound Manager
// (that's SoundManager.ts, used only inside the battle scene). Returns the
// element so a caller that starts a loop (menu music) can stop/fade it
// later; one-shot UI sounds can just ignore the return value.
export function playDomSound(url: string, opts: { loop?: boolean; volume?: number } = {}): HTMLAudioElement {
  const audio = new Audio(url);
  audio.loop = opts.loop ?? false;
  audio.volume = opts.volume ?? 1;
  audio.muted = readMuted();
  audio.play().catch(() => {}); // browsers block autoplay before a user gesture, and the file may not exist yet -- either way, fail silently
  return audio;
}
