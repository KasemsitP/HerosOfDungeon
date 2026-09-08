import { useEffect, useState } from "react";
import { Room } from "colyseus.js";
import { ATTACK2_COOLDOWN_MS, ATTACK3_COOLDOWN_MS, Side } from "@hnd/shared";
import { BattleStateView, PlayerView } from "../network/types";
import { PhaserGame } from "../game/PhaserGame";
import { CooldownIndicator } from "./CooldownIndicator";

interface Props {
  room: Room<BattleStateView>;
  mySide: Side;
  onMatchFinished: (winner: string) => void;
}

interface HudPlayer {
  name: string;
  hp: number;
  maxHp: number;
}

export function BattleScreen({ room, mySide, onMatchFinished }: Props) {
  const [timeLeft, setTimeLeft] = useState(room.state.timeLeft);
  const [hero, setHero] = useState<HudPlayer | null>(null);
  const [demon, setDemon] = useState<HudPlayer | null>(null);

  useEffect(() => {
    const syncPlayer = (player: PlayerView) => {
      const snapshot: HudPlayer = { name: player.name, hp: player.hp, maxHp: player.maxHp };
      if (player.side === "hero") setHero(snapshot);
      else setDemon(snapshot);
    };

    room.state.players.forEach(syncPlayer);
    room.state.players.onAdd((player) => {
      syncPlayer(player);
      player.onChange(() => syncPlayer(player));
    });

    const stateChangeHandler = () => {
      setTimeLeft(room.state.timeLeft);
      if (room.state.status === "finished") {
        onMatchFinished(room.state.winner);
      }
    };
    room.state.onChange(stateChangeHandler);

    return () => {
      // colyseus.js tears down all listeners when the room leaves; nothing to unsubscribe here.
    };
  }, [room, onMatchFinished]);

  return (
    <div className="battle-screen">
      <div className="hud">
        <HpBar label={hero?.name ?? "Hero"} hp={hero?.hp ?? 0} maxHp={hero?.maxHp ?? 1} align="left" />
        <div className="timer">{timeLeft}s</div>
        <HpBar label={demon?.name ?? "Demon"} hp={demon?.hp ?? 0} maxHp={demon?.maxHp ?? 1} align="right" />
      </div>
      <div className={`cooldowns cooldowns--${mySide === "hero" ? "left" : "right"}`}>
        <CooldownIndicator label="X" cooldownMs={ATTACK2_COOLDOWN_MS} triggerKey="attack2" />
        <CooldownIndicator label="C" cooldownMs={ATTACK3_COOLDOWN_MS} triggerKey="attack3" />
      </div>
      <PhaserGame room={room} />
    </div>
  );
}

function HpBar({ label, hp, maxHp, align }: { label: string; hp: number; maxHp: number; align: "left" | "right" }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className={`hp-bar hp-bar--${align}`}>
      <span className="hp-bar__label">{label}</span>
      <div className="hp-bar__track">
        <div className="hp-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
