// User preference, not game state -- localStorage is the right place for it
// (unlike actual match/game state, which this project deliberately never
// persists client-side). Both the Phaser side (SoundManager) and the DOM
// side (domAudio, useMuteState) read/write this same key so a single mute
// toggle covers both audio systems.
const MUTE_STORAGE_KEY = "hnd_muted";

export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // localStorage unavailable (private browsing, etc.) -- mute just won't persist across reloads
  }
}
