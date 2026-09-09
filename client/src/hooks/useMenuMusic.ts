import { useEffect } from "react";
import { readMuted } from "../audio/muteStorage";
import { muteBus } from "../network/muteBus";

const MENU_MUSIC_URL = "/assets/audio/music/menu.mp3";
const FADE_MS = 500;

// Mount this once, at the top of whichever screens should have the menu
// loop playing (Main Menu, Lobby, Room Lobby) -- it starts the loop on
// mount and fades it out on unmount, so navigating into a battle (which has
// its own music via SoundManager) or back out doesn't hard-cut the audio.
export function useMenuMusic() {
  useEffect(() => {
    const audio = new Audio(MENU_MUSIC_URL);
    audio.loop = true;
    audio.volume = 0;
    audio.muted = readMuted();
    audio.play().catch(() => {}); // file may not exist yet, or autoplay blocked -- fail silently

    let fadeInterval: ReturnType<typeof setInterval> | undefined;
    const fadeTo = (target: number, onDone?: () => void) => {
      clearInterval(fadeInterval);
      const steps = 20;
      const stepMs = FADE_MS / steps;
      const stepAmount = (target - audio.volume) / steps;
      let i = 0;
      fadeInterval = setInterval(() => {
        i += 1;
        audio.volume = Math.max(0, Math.min(1, audio.volume + stepAmount));
        if (i >= steps) {
          clearInterval(fadeInterval);
          audio.volume = target;
          onDone?.();
        }
      }, stepMs);
    };
    fadeTo(0.4);

    const unsubscribe = muteBus.subscribe((muted) => {
      audio.muted = muted;
    });

    return () => {
      unsubscribe();
      fadeTo(0, () => audio.pause());
    };
  }, []);
}
