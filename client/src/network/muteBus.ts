// Same sibling pub-sub pattern as actionBus.ts/deathBus.ts, but two-way in
// spirit: React (the mute button, useMuteState) is the source of truth and
// emits here; both Phaser (SoundManager, inside a battle) and any other
// React audio (menu music) subscribe so a toggle takes effect on
// already-playing audio immediately, not just on the next mount/scene boot.
type Listener = (muted: boolean) => void;

const listeners = new Set<Listener>();

export const muteBus = {
  emit(muted: boolean) {
    listeners.forEach((listener) => listener(muted));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
