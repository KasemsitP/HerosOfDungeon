import { useState } from "react";
import { CharacterClass, CharacterSkin, Side } from "@hnd/shared";
import { CLASS_OPTIONS, CLASS_SKINS, defaultSkinFor } from "../characterOptions";
import { useMenuMusic } from "../hooks/useMenuMusic";

interface Props {
  onFindMatch: (name: string, side: Side, characterClass: CharacterClass, skin: CharacterSkin) => void;
  onPractice: (name: string, side: Side, characterClass: CharacterClass, skin: CharacterSkin) => void;
  status: "idle" | "connecting" | "error";
  errorMessage?: string;
}

export function Lobby({ onFindMatch, onPractice, status, errorMessage }: Props) {
  useMenuMusic();

  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("hero");
  const [characterClass, setCharacterClass] = useState<CharacterClass>("knight");
  const [skin, setSkin] = useState<CharacterSkin>("knight-1");

  const canSubmit = name.trim().length > 0 && status !== "connecting";
  const skinOptions = CLASS_SKINS[characterClass];

  const selectClass = (nextClass: CharacterClass) => {
    setCharacterClass(nextClass);
    setSkin(defaultSkinFor(nextClass));
  };

  return (
    <div className="retro-screen retro-halftone" style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        className="retro-panel"
        style={{ width: 520, padding: 32, display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}
      >
        <h1 className="retro-heading" style={{ fontSize: 20, textAlign: "center", margin: 0 }}>
          Heroes and Dungeons
        </h1>

        <label className="retro-field">
          <span>Player name</span>
          <input
            className="retro-input"
            style={{ width: "100%" }}
            value={name}
            maxLength={20}
            placeholder="Enter your name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <fieldset className="retro-toggle-group">
          <legend>Choose your side</legend>
          <label className={side === "hero" ? "selected" : ""}>
            <input type="radio" name="side" checked={side === "hero"} onChange={() => setSide("hero")} />
            Hero
          </label>
          <label className={side === "demon" ? "selected" : ""}>
            <input type="radio" name="side" checked={side === "demon"} onChange={() => setSide("demon")} />
            Demon
          </label>
        </fieldset>

        {side === "hero" && (
          <fieldset className="retro-toggle-group">
            <legend>Choose your class</legend>
            {CLASS_OPTIONS.map((option) => (
              <label key={option.value} className={characterClass === option.value ? "selected" : ""}>
                <input
                  type="radio"
                  name="characterClass"
                  checked={characterClass === option.value}
                  onChange={() => selectClass(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        )}

        {side === "hero" && skinOptions.length > 1 && (
          <fieldset className="retro-toggle-group">
            <legend>Choose your look</legend>
            {skinOptions.map((option) => (
              <label key={option.value} className={skin === option.value ? "selected" : ""}>
                <input
                  type="radio"
                  name="skin"
                  checked={skin === option.value}
                  onChange={() => setSkin(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        )}

        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <button
            className="retro-btn"
            style={{ flex: 1, height: 56 }}
            disabled={!canSubmit}
            onClick={() => onFindMatch(name.trim(), side, characterClass, skin)}
          >
            {status === "connecting" ? "Finding match..." : "Find Match"}
          </button>
          <button
            className="retro-btn retro-btn--secondary"
            style={{ flex: 1, height: 56 }}
            disabled={!canSubmit}
            onClick={() => onPractice(name.trim(), side, characterClass, skin)}
          >
            Practice vs AI
          </button>
        </div>

        {status === "error" && <p className="retro-error">{errorMessage ?? "Connection failed."}</p>}
      </div>
    </div>
  );
}
