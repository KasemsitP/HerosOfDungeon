import type { AnimState, BattleStatus, CharacterClass, CharacterSkin, Side, WeaponType } from "@hnd/shared";

// Mirrors server/src/schema/*.ts. colyseus.js decodes the wire schema at
// runtime into instances that carry these fields plus @colyseus/schema's
// callback methods (onChange, onAdd, onRemove) — these are structural types
// for editor/type-checking only, not classes we instantiate ourselves.
export interface PlayerView {
  name: string;
  side: Side;
  characterClass: CharacterClass;
  skin: CharacterSkin;
  weaponType: WeaponType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  animState: AnimState;
  facingLeft: boolean;
  connected: boolean;
  shieldDurability: number;
  shieldBroken: boolean;
  ready: boolean;
  onChange(callback: () => void): void;
}

export interface PlayersMapView {
  get(sessionId: string): PlayerView | undefined;
  forEach(callback: (player: PlayerView, sessionId: string) => void): void;
  onAdd(callback: (player: PlayerView, sessionId: string) => void): void;
  onRemove(callback: (player: PlayerView, sessionId: string) => void): void;
  size: number;
}

export interface ProjectileView {
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  damage: number;
  projectileType: "kunai" | "arrow" | "bolt";
  onChange(callback: () => void): void;
}

export interface ProjectilesMapView {
  forEach(callback: (projectile: ProjectileView, id: string) => void): void;
  onAdd(callback: (projectile: ProjectileView, id: string) => void): void;
  onRemove(callback: (projectile: ProjectileView, id: string) => void): void;
}

export interface BattleStateView {
  players: PlayersMapView;
  projectiles: ProjectilesMapView;
  timeLeft: number;
  status: BattleStatus;
  winner: string;
  hostId: string;
  onChange(callback: () => void): void;
}
