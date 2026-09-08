import { ActionType } from "@hnd/shared";

// Tiny pub-sub bridging Phaser (BattleScene, which sends actions to the
// room) and React (CooldownIndicator, which wants to know the moment an
// action was sent so it can start an optimistic cooldown timer). The two
// have no other connection to each other — they're independent siblings
// under BattleScreen, both holding the same `room` but not each other.
type Listener = (type: ActionType) => void;

const listeners = new Set<Listener>();

export const actionBus = {
  emit(type: ActionType) {
    listeners.forEach((listener) => listener(type));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
