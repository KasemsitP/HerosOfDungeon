import { useState } from "react";
import { Side } from "@hnd/shared";

interface Props {
  onFindMatch: (name: string, side: Side) => void;
  onPractice: (name: string, side: Side) => void;
  status: "idle" | "connecting" | "error";
  errorMessage?: string;
}

export function Lobby({ onFindMatch, onPractice, status, errorMessage }: Props) {
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("hero");

  const canSubmit = name.trim().length > 0 && status !== "connecting";

  return (
    <div className="lobby">
      <h1>Heroes and Dungeons</h1>

      <label className="field">
        <span>Player name</span>
        <input
          value={name}
          maxLength={20}
          placeholder="Enter your name"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <fieldset className="side-select">
        <legend>Choose your side</legend>
        <label className={side === "hero" ? "selected" : ""}>
          <input
            type="radio"
            name="side"
            checked={side === "hero"}
            onChange={() => setSide("hero")}
          />
          Hero
        </label>
        <label className={side === "demon" ? "selected" : ""}>
          <input
            type="radio"
            name="side"
            checked={side === "demon"}
            onChange={() => setSide("demon")}
          />
          Demon
        </label>
      </fieldset>

      <div className="lobby-actions">
        <button disabled={!canSubmit} onClick={() => onFindMatch(name.trim(), side)}>
          {status === "connecting" ? "Finding match..." : "Find Match"}
        </button>
        <button
          className="secondary"
          disabled={!canSubmit}
          onClick={() => onPractice(name.trim(), side)}
        >
          Practice vs AI
        </button>
      </div>

      {status === "error" && <p className="error">{errorMessage ?? "Connection failed."}</p>}
    </div>
  );
}
