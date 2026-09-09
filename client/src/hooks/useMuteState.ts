import { useCallback, useState } from "react";
import { readMuted, writeMuted } from "../audio/muteStorage";
import { muteBus } from "../network/muteBus";

// Single source of truth for the mute toggle. Any component can call this
// (only the HUD mute button does today) and they'll all stay in sync, since
// state is read from/written to the same localStorage key and every change
// is broadcast on muteBus for SoundManager/menu-music to react to live.
export function useMuteState() {
  const [muted, setMuted] = useState(readMuted);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      writeMuted(next);
      muteBus.emit(next);
      return next;
    });
  }, []);

  return { muted, toggleMute };
}
