// Bridges BattleScene (Phaser) -> BattleScreen (React), same sibling
// pub-sub pattern as actionBus.ts. Phaser owns the 5s cinematic slowmo
// sequence entirely (camera/timeScale/animation); React just waits for the
// "it's done, safe to navigate to ResultScreen" signal instead of racing it
// with its own independent timer.
type Listener = () => void;

const listeners = new Set<Listener>();

export const deathBus = {
  emitComplete() {
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
