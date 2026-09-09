import { CONTROLS_CONFIG } from "../config/controlsConfig";
import { KeyBadge } from "./KeyBadge";

interface Props {
  onBack: () => void;
}

export function ControlsScreen({ onBack }: Props) {
  return (
    <div className="retro-screen retro-halftone">
      <div style={{ display: "flex", justifyContent: "space-between", padding: 16, alignItems: "center" }}>
        <span className="retro-heading" style={{ fontSize: 12 }}>
          Heroes and Dungeons
        </span>
        <button className="retro-btn retro-btn--secondary" onClick={onBack}>
          ย้อนกลับ
        </button>
      </div>

      <h1 className="retro-heading" style={{ fontSize: 28, textAlign: "center", margin: "8px 0 0" }}>
        วิธีเล่น
      </h1>

      <div className="controls-content">
        {CONTROLS_CONFIG.map((section) => (
          <div key={section.title} className="retro-panel" style={{ padding: 24 }}>
            <h2 className="retro-heading controls-section__title">{section.title}</h2>

            {section.entries.map((entry) => (
              <div key={entry.label} className="controls-entry">
                {entry.keys.length > 0 && (
                  <div className="controls-entry__keys">
                    {entry.keys.map((key, i) => (
                      <KeyBadge key={`${entry.label}-${i}-${key}`} label={key} />
                    ))}
                  </div>
                )}
                <div className="controls-entry__text">
                  <span className="controls-entry__label">{entry.label}</span>
                  {entry.detail && <span className="controls-entry__detail">{entry.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}

        <button className="retro-btn" style={{ height: 56, alignSelf: "center", width: 260 }} onClick={onBack}>
          กลับเมนูหลัก
        </button>
      </div>
    </div>
  );
}
