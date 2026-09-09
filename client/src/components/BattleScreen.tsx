import { useEffect, useRef, useState } from "react";
import { Room } from "colyseus.js";
import { ATTACK2_COOLDOWN_MS, ATTACK3_COOLDOWN_MS, RECONNECT_GRACE_SECONDS, SHIELD_MAX_DURABILITY, Side } from "@hnd/shared";
import { BattleStateView, PlayerView } from "../network/types";
import { PhaserGame } from "../game/PhaserGame";
import { CooldownIndicator } from "./CooldownIndicator";
import { DisconnectOverlay } from "./DisconnectOverlay";
import { DeathOverlay } from "./DeathOverlay";
import { deathBus } from "../network/deathBus";
import { useMuteState } from "../hooks/useMuteState";

interface Props {
  room: Room<BattleStateView>;
  mySide: Side;
  onMatchFinished: (winner: string) => void;
  onBackToMenu: () => void;
}

interface HudPlayer {
  name: string;
  hp: number;
  maxHp: number;
  shieldDurability: number;
  shieldBroken: boolean;
  connected: boolean;
}

const LOW_TIME_SECONDS = 10;

export function BattleScreen({ room, mySide, onMatchFinished, onBackToMenu }: Props) {
  const [timeLeft, setTimeLeft] = useState(room.state.timeLeft);
  const [hero, setHero] = useState<HudPlayer | null>(null);
  const [demon, setDemon] = useState<HudPlayer | null>(null);
  const disconnectedAtRef = useRef<number | null>(null);
  const [disconnectDeadline, setDisconnectDeadline] = useState<number | null>(null);

  useEffect(() => {
    const syncPlayer = (player: PlayerView) => {
      const snapshot: HudPlayer = {
        name: player.name,
        hp: player.hp,
        maxHp: player.maxHp,
        shieldDurability: player.shieldDurability,
        shieldBroken: player.shieldBroken,
        connected: player.connected,
      };
      if (player.side === "hero") setHero(snapshot);
      else setDemon(snapshot);

      const isOpponent = player.side !== mySide;
      if (isOpponent) {
        if (!player.connected && disconnectedAtRef.current === null) {
          disconnectedAtRef.current = Date.now();
          setDisconnectDeadline(disconnectedAtRef.current + RECONNECT_GRACE_SECONDS * 1000);
        } else if (player.connected && disconnectedAtRef.current !== null) {
          disconnectedAtRef.current = null;
          setDisconnectDeadline(null);
        }
      }
    };

    room.state.players.forEach(syncPlayer);
    room.state.players.onAdd((player) => {
      syncPlayer(player);
      player.onChange(() => syncPlayer(player));
    });

    const stateChangeHandler = () => {
      setTimeLeft(room.state.timeLeft);
      if (room.state.status === "finished") {
        let anyDead = false;
        room.state.players.forEach((p) => {
          if (p.hp <= 0) anyDead = true;
        });
        // A kill: BattleScene runs its 5s cinematic slowmo and signals
        // deathBus when it's done -- don't cut away early. A timeout-based
        // ending (no one actually died) has no sequence to wait for.
        if (!anyDead) onMatchFinished(room.state.winner);
      }
    };
    room.state.onChange(stateChangeHandler);

    return () => {
      // colyseus.js tears down all listeners when the room leaves; nothing to unsubscribe here.
    };
  }, [room, mySide, onMatchFinished]);

  useEffect(() => {
    return deathBus.subscribe(() => onMatchFinished(room.state.winner));
  }, [room, onMatchFinished]);

  const anyDead = (hero?.hp ?? 1) <= 0 || (demon?.hp ?? 1) <= 0;
  const { muted, toggleMute } = useMuteState();

  return (
    <div className="battle-screen">
      <div className="hud">
        <div className="hud__side">
          <HpBar label={hero?.name ?? "Hero"} hp={hero?.hp ?? 0} maxHp={hero?.maxHp ?? 1} align="left" />
          <ShieldBar durability={hero?.shieldDurability ?? SHIELD_MAX_DURABILITY} broken={hero?.shieldBroken ?? false} align="left" />
        </div>
        <div className={`timer ${timeLeft < LOW_TIME_SECONDS ? "timer--low" : ""}`}>{timeLeft}</div>
        <div className="hud__side">
          <HpBar label={demon?.name ?? "Demon"} hp={demon?.hp ?? 0} maxHp={demon?.maxHp ?? 1} align="right" />
          <ShieldBar durability={demon?.shieldDurability ?? SHIELD_MAX_DURABILITY} broken={demon?.shieldBroken ?? false} align="right" />
        </div>
      </div>

      <button className="hud-mute-btn" onClick={toggleMute} aria-pressed={muted}>
        {muted ? "UNMUTE" : "MUTE"}
      </button>

      <div className={`battle-hud-bottom ${anyDead ? "battle-hud-bottom--disabled" : ""}`}>
        <div className={`battle-hud-bottom__skills battle-hud-bottom__skills--${mySide === "hero" ? "left" : "right"}`}>
          <CooldownIndicator label="X" cooldownMs={ATTACK2_COOLDOWN_MS} triggerKey="attack2" />
          <CooldownIndicator label="C" cooldownMs={ATTACK3_COOLDOWN_MS} triggerKey="attack3" />
        </div>
      </div>

      <div className={`battle-canvas-wrap ${anyDead ? "battle-canvas-wrap--dead" : ""}`}>
        <PhaserGame room={room} />
      </div>

      <DeathOverlay active={anyDead} />
      {disconnectDeadline !== null && <DisconnectOverlay deadline={disconnectDeadline} onBackToMenu={onBackToMenu} />}
    </div>
  );
}

function hpTier(pct: number): "high" | "mid" | "low" {
  if (pct > 50) return "high";
  if (pct > 20) return "mid";
  return "low";
}

function HpBar({ label, hp, maxHp, align }: { label: string; hp: number; maxHp: number; align: "left" | "right" }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className={`hp-bar hp-bar--${align}`}>
      <div className="hp-bar__header">
        <span className="hp-bar__label">{label}</span>
        <span className="hp-bar__value">
          {Math.max(0, Math.ceil(hp))}/{maxHp}
        </span>
      </div>
      <div className="hp-bar__track">
        <div className={`hp-bar__fill hp-bar__fill--${hpTier(pct)}`} style={{ width: `${pct}%` }} />
        <div className="hp-bar__notches" />
      </div>
    </div>
  );
}

function ShieldBar({ durability, broken, align }: { durability: number; broken: boolean; align: "left" | "right" }) {
  const pct = Math.max(0, Math.min(100, (durability / SHIELD_MAX_DURABILITY) * 100));
  return (
    <div className={`shield-bar shield-bar--${align} ${broken ? "shield-bar--broken" : ""}`}>
      <div className="shield-bar__track">
        <div className="shield-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      {broken && <span className="shield-bar__label">Broken</span>}
    </div>
  );
}
