import { useEffect, useState } from "react";
import { ActionType } from "@hnd/shared";
import { actionBus } from "../network/actionBus";

interface Props {
  label: string;
  cooldownMs: number;
  triggerKey: Extract<ActionType, "attack2" | "attack3">;
}

// Cooldown timestamps are server-only (never synced), so this is a purely
// optimistic client-local timer started the moment the action is sent —
// cosmetic only, not a source of truth. See actionBus for how BattleScene
// (Phaser) notifies this component (React) that an action was sent.
export function CooldownIndicator({ label, cooldownMs, triggerKey }: Props) {
  const [readyAt, setReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    return actionBus.subscribe((type) => {
      if (type === triggerKey) setReadyAt(Date.now() + cooldownMs);
    });
  }, [triggerKey, cooldownMs]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, readyAt - now);
  const pct = cooldownMs > 0 ? Math.min(100, (remainingMs / cooldownMs) * 100) : 0;
  const ready = remainingMs <= 0;

  return (
    <div className={`cooldown ${ready ? "cooldown--ready" : ""}`}>
      <span className="cooldown__label">{label}</span>
      <div className="cooldown__overlay" style={{ height: `${pct}%` }} />
      {!ready && <span className="cooldown__seconds">{(remainingMs / 1000).toFixed(1)}</span>}
    </div>
  );
}
