import { useState } from "react";
import { Room } from "colyseus.js";
import { CharacterClass, CharacterSkin, MessageType, Side } from "@hnd/shared";
import { createPrivateRoom, joinRoomById } from "../network/colyseusClient";
import { BattleStateView } from "../network/types";
import { CLASS_OPTIONS, CLASS_SKINS, defaultSkinFor } from "../characterOptions";

interface Props {
  onRoomReady: (room: Room<BattleStateView>, mySide: Side) => void;
  onCancel: () => void;
}

export function CreateRoomModal({ onRoomReady, onCancel }: Props) {
  const [phase, setPhase] = useState<"form" | "creating" | "waiting" | "error">("form");
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("hero");
  const [characterClass, setCharacterClass] = useState<CharacterClass>("knight");
  const [skin, setSkin] = useState<CharacterSkin>("knight-1");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [room, setRoom] = useState<Room<BattleStateView> | null>(null);

  const selectClass = (nextClass: CharacterClass) => {
    setCharacterClass(nextClass);
    setSkin(defaultSkinFor(nextClass));
    room?.send(MessageType.SelectCharacter, { characterClass: nextClass, skin: defaultSkinFor(nextClass) });
  };

  const selectSkin = (nextSkin: CharacterSkin) => {
    setSkin(nextSkin);
    room?.send(MessageType.SelectCharacter, { characterClass, skin: nextSkin });
  };

  const handleCreate = async () => {
    setPhase("creating");
    setErrorMessage("");
    try {
      const { code: newCode, roomId } = await createPrivateRoom();
      const joinedRoom = await joinRoomById(roomId, { name: name.trim(), side, characterClass, skin });
      setCode(newCode);
      setRoom(joinedRoom);
      setPhase("waiting");

      joinedRoom.state.players.onAdd(() => {
        if (joinedRoom.state.players.size === 2) {
          onRoomReady(joinedRoom, side);
        }
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not create a room right now.");
      setPhase("error");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied -- code is still visible on screen, nothing more to do
    }
  };

  const skinOptions = CLASS_SKINS[characterClass];

  const handleClose = () => {
    room?.leave();
    onCancel();
  };

  return (
    <div className="retro-modal-backdrop">
      <div className="retro-panel" style={{ width: 400, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{phase === "waiting" ? "สร้างห้องสำเร็จ" : "สร้างห้อง"}</h2>
          <button className="retro-btn retro-btn--secondary" style={{ padding: "4px 10px" }} onClick={handleClose}>
            X
          </button>
        </div>

        {(phase === "form" || phase === "creating" || phase === "error") && (
          <>
            <label className="retro-field">
              <span>ชื่อผู้เล่น</span>
              <input
                className="retro-input"
                value={name}
                maxLength={20}
                placeholder="Enter your name"
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="retro-class-picker">
              {(["hero", "demon"] as Side[]).map((s) => (
                <button key={s} className={side === s ? "selected" : ""} onClick={() => setSide(s)}>
                  {s === "hero" ? "Hero" : "Demon"}
                </button>
              ))}
            </div>

            {errorMessage && <p className="retro-error">{errorMessage}</p>}

            <button
              className="retro-btn"
              style={{ height: 56 }}
              disabled={name.trim().length === 0 || phase === "creating"}
              onClick={handleCreate}
            >
              {phase === "creating" ? "กำลังสร้าง..." : "สร้างห้อง"}
            </button>
          </>
        )}

        {phase === "waiting" && (
          <>
            <p style={{ fontSize: 14, margin: 0, color: "var(--retro-muted)" }}>รหัสห้องของคุณ</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div className="retro-code-box" style={{ flex: 1 }}>
                {code}
              </div>
              <button className="retro-btn retro-btn--secondary" onClick={handleCopy}>
                {copied ? "✓" : "คัดลอก"}
              </button>
            </div>

            <p style={{ fontSize: 14, margin: "8px 0 0" }}>ผู้เล่นในห้อง (1/2)</p>
            <div className="retro-panel retro-player-card">
              <div className="retro-player-card__avatar">{characterClass[0].toUpperCase()}</div>
              <strong>{name.trim() || "คุณ"} (Host)</strong>
              <div className="retro-class-picker">
                {CLASS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={characterClass === option.value ? "selected" : ""}
                    onClick={() => selectClass(option.value)}
                  >
                    {option.label.slice(0, 2)}
                  </button>
                ))}
              </div>
              {skinOptions.length > 1 && (
                <select
                  className="retro-input"
                  value={skin}
                  onChange={(e) => selectSkin(e.target.value as CharacterSkin)}
                >
                  {skinOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p className="retro-dots" style={{ textAlign: "center", color: "var(--retro-muted)" }}>
              รอผู้เล่น
            </p>
          </>
        )}
      </div>
    </div>
  );
}
