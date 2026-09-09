import { useCallback } from "react";
import { playDomSound } from "../audio/domAudio";

// One-shot UI sounds (button clicks, modal open/close, room-join
// notification) -- plain React DOM territory, see domAudio.ts. Add the
// actual files at these paths once sourced (see the audio README) --
// missing files just fail silently (playDomSound swallows the play() error).
const UI_SOUND_FILES = {
  click: "/assets/audio/sfx/ui-click.mp3",
  confirm: "/assets/audio/sfx/ui-confirm.mp3",
  notify: "/assets/audio/sfx/ui-notify.mp3",
} as const;

export type UISoundName = keyof typeof UI_SOUND_FILES;

export function useUISound() {
  return useCallback((name: UISoundName) => {
    playDomSound(UI_SOUND_FILES[name], { volume: 0.5 });
  }, []);
}
