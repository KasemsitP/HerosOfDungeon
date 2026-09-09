import { useMenuMusic } from "../hooks/useMenuMusic";
import { useUISound } from "../hooks/useUISound";

interface Props {
  onQuickMatch: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onControls: () => void;
}

export function MainMenu({ onQuickMatch, onCreateRoom, onJoinRoom, onControls }: Props) {
  useMenuMusic();
  const playUiSound = useUISound();

  const withClickSound = (action: () => void) => () => {
    playUiSound("click");
    action();
  };

  return (
    <div className="retro-screen retro-halftone" style={{ alignItems: "center", justifyContent: "center" }}>
      <div className="retro-panel" style={{ width: 480, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 className="retro-heading" style={{ fontSize: 16, textAlign: "center", margin: "0 0 8px" }}>
          Heroes and Dungeons
        </h1>
        <p style={{ textAlign: "center", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>เลือกโหมดการเล่น</p>

        <button className="retro-btn" style={{ height: 64 }} onClick={withClickSound(onQuickMatch)}>
          หาคู่ต่อสู้
        </button>
        <button className="retro-btn" style={{ height: 64 }} onClick={withClickSound(onCreateRoom)}>
          สร้างห้อง
        </button>
        <button className="retro-btn" style={{ height: 64 }} onClick={withClickSound(onJoinRoom)}>
          เข้าร่วมห้อง
        </button>
        <button className="retro-btn retro-btn--secondary" style={{ height: 56 }} onClick={withClickSound(onControls)}>
          วิธีเล่น
        </button>
      </div>
    </div>
  );
}
