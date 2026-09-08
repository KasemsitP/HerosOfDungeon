import type { AnimState, BattleStatus, Side } from "@hnd/shared";

// Mirrors server/src/schema/*.ts. colyseus.js decodes the wire schema at
// runtime into instances that carry these fields plus @colyseus/schema's
// callback methods (onChange, onAdd, onRemove) — these are structural types
// for editor/type-checking only, not classes we instantiate ourselves.
export interface PlayerView {
  name: string;
  side: Side;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  animState: AnimState;
  facingLeft: boolean;
  connected: boolean;
  onChange(callback: () => void): void;
}

export interface PlayersMapView {
  get(sessionId: string): PlayerView | undefined;
  forEach(callback: (player: PlayerView, sessionId: string) => void): void;
  onAdd(callback: (player: PlayerView, sessionId: string) => void): void;
  onRemove(callback: (player: PlayerView, sessionId: string) => void): void;
  size: number;
}

export interface BattleStateView {
  players: PlayersMapView;
  timeLeft: number;
  status: BattleStatus;
  winner: string;
  onChange(callback: () => void): void;
}
