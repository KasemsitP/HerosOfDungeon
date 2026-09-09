import { useState } from "react";
import { Room } from "colyseus.js";
import { Side } from "@hnd/shared";
import { joinRoomById, resolveRoomCode } from "../network/colyseusClient";
import { BattleStateView } from "../network/types";
import { ROOM_CODE_LENGTH } from "@hnd/shared";

interface Props {
  onJoined: (room: Room<BattleStateView>, mySide: Side) => void;
  onCancel: () => void;
}

export function JoinRoomModal({ onJoined, onCancel }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "joining" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = name.trim().length > 0 && code.length === ROOM_CODE_LENGTH && status !== "joining";

  const handleJoin = async () => {
    setStatus("joining");
    setErrorMessage("");
    try {
      const roomId = await resolveRoomCode(code);
      // Guest doesn't pick a side up front -- the server assigns whichever
      // side the host didn't take (resolveSide in BattleRoom.ts).
      const side: Side = "demon";
      const room = await joinRoomById(roomId, { name: name.trim(), side });
      const assignedSide = room.state.players.get(room.sessionId)?.side ?? side;
      onJoined(room, assignedSide);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "เข้าร่วมห้องไม่สำเร็จ");
      setStatus("error");
    }
  };

  return (
    <div className="retro-modal-backdrop">
      <div className="retro-panel" style={{ width: 340, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>เข้าร่วมห้อง</h2>
          <button className="retro-btn retro-btn--secondary" style={{ padding: "4px 10px" }} onClick={onCancel}>
            X
          </button>
        </div>

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

        <label className="retro-field">
          <span>ใส่รหัสห้อง {ROOM_CODE_LENGTH} หลัก</span>
          <input
            className="retro-input"
            style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            placeholder={"_".repeat(ROOM_CODE_LENGTH)}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
        </label>

        {status === "error" && <p className="retro-error">{errorMessage}</p>}

        <button className="retro-btn" style={{ height: 56 }} disabled={!canSubmit} onClick={handleJoin}>
          {status === "joining" ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
        </button>
      </div>
    </div>
  );
}
