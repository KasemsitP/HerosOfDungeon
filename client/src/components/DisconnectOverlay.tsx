import { useEffect, useState } from "react";

interface Props {
  deadline: number; // Date.now()-based timestamp; purely cosmetic countdown, the
  // server's own onLeave/allowReconnection logic (BattleRoom.ts) is the real timer
  onBackToMenu: () => void;
}

export function DisconnectOverlay({ deadline, onBackToMenu }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, deadline - now);
  const seconds = Math.floor(remainingMs / 1000);
  const label = `0:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="retro-modal-backdrop" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="retro-panel" style={{ width: 360, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 22, margin: 0 }}>คู่ต่อสู้หลุดการเชื่อมต่อ</p>
        <p style={{ margin: 0, color: "var(--retro-muted)" }}>รอการเชื่อมต่อกลับ... {label}</p>
        <button className="retro-btn retro-btn--secondary" onClick={onBackToMenu}>
          กลับเมนูหลัก
        </button>
      </div>
    </div>
  );
}
