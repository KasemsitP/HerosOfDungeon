import { useEffect, useState } from "react";
import { Room } from "colyseus.js";
import { CharacterClass, CharacterSkin, MessageType } from "@hnd/shared";
import { BattleStateView, PlayerView } from "../network/types";
import { CLASS_OPTIONS, CLASS_SKINS, defaultSkinFor } from "../characterOptions";
import { useMenuMusic } from "../hooks/useMenuMusic";

interface Props {
  room: Room<BattleStateView>;
  onGameStart: () => void;
  onLeaveRoom: () => void;
}

interface LobbyPlayer {
  name: string;
  characterClass: CharacterClass;
  skin: CharacterSkin;
  ready: boolean;
}

export function RoomLobby({ room, onGameStart, onLeaveRoom }: Props) {
  useMenuMusic();

  const [players, setPlayers] = useState<Record<string, LobbyPlayer>>({});
  const [hostId, setHostId] = useState(room.state.hostId);

  const mySessionId = room.sessionId;
  const isHost = mySessionId === hostId;
  const me = players[mySessionId];
  const opponentEntry = Object.entries(players).find(([id]) => id !== mySessionId);
  const opponent = opponentEntry?.[1];

  useEffect(() => {
    const syncPlayer = (player: PlayerView, sessionId: string) => {
      setPlayers((prev) => ({
        ...prev,
        [sessionId]: { name: player.name, characterClass: player.characterClass, skin: player.skin, ready: player.ready },
      }));
    };

    room.state.players.forEach(syncPlayer);
    room.state.players.onAdd((player) => {
      syncPlayer(player, findSessionId(room, player));
      player.onChange(() => syncPlayer(player, findSessionId(room, player)));
    });

    const stateChangeHandler = () => {
      setHostId(room.state.hostId);
      if (room.state.status === "playing") onGameStart();
    };
    room.state.onChange(stateChangeHandler);
  }, [room, onGameStart]);

  const selectClass = (nextClass: CharacterClass) => {
    room.send(MessageType.SelectCharacter, { characterClass: nextClass, skin: defaultSkinFor(nextClass) });
  };

  const selectSkin = (nextSkin: CharacterSkin) => {
    if (!me) return;
    room.send(MessageType.SelectCharacter, { characterClass: me.characterClass, skin: nextSkin });
  };

  const toggleReady = () => room.send(MessageType.ToggleReady);
  const startGame = () => room.send(MessageType.StartGame);

  const bothReady = Boolean(me?.ready && opponent?.ready);
  const skinOptions = me ? CLASS_SKINS[me.characterClass] : [];

  return (
    <div className="retro-screen retro-halftone">
      <div style={{ display: "flex", justifyContent: "space-between", padding: 16, alignItems: "center" }}>
        <span className="retro-heading" style={{ fontSize: 12 }}>ห้อง</span>
        <button className="retro-btn retro-btn--secondary" onClick={onLeaveRoom}>
          ออกจากห้อง
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <PlayerCard
          player={me}
          isMe
          onSelectClass={selectClass}
          onSelectSkin={selectSkin}
          skinOptions={skinOptions}
        />

        <div className="retro-vs-badge">VS</div>

        <PlayerCard player={opponent} isMe={false} placeholder="รอผู้เล่น..." />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingBottom: 32 }}>
        {me && (
          <button className="retro-btn retro-btn--secondary" onClick={toggleReady}>
            {me.ready ? "✓ พร้อมแล้ว" : "กดพร้อม"}
          </button>
        )}

        {isHost ? (
          <button className="retro-btn" style={{ height: 56, width: 260 }} disabled={!bothReady} onClick={startGame}>
            เริ่มเกม
          </button>
        ) : (
          <p style={{ color: "var(--retro-muted)" }}>รอโฮสต์เริ่มเกม...</p>
        )}
      </div>
    </div>
  );
}

function findSessionId(room: Room<BattleStateView>, player: PlayerView): string {
  let found = "";
  room.state.players.forEach((p, id) => {
    if (p === player) found = id;
  });
  return found;
}

function PlayerCard({
  player,
  isMe,
  placeholder,
  onSelectClass,
  onSelectSkin,
  skinOptions,
}: {
  player: LobbyPlayer | undefined;
  isMe: boolean;
  placeholder?: string;
  onSelectClass?: (c: CharacterClass) => void;
  onSelectSkin?: (s: CharacterSkin) => void;
  skinOptions?: { value: CharacterSkin; label: string }[];
}) {
  return (
    <div className="retro-panel retro-player-card" style={{ width: 220, minHeight: 280 }}>
      <div className="retro-player-card__avatar">{player ? player.characterClass[0].toUpperCase() : "?"}</div>
      <strong>{player ? `${player.name}${isMe ? " (You)" : ""}` : placeholder ?? "..."}</strong>

      {player && (
        <>
          <span style={{ fontSize: 13, color: "var(--retro-muted)" }}>{player.characterClass}</span>

          {isMe && onSelectClass && (
            <div className="retro-class-picker">
              {CLASS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={player.characterClass === option.value ? "selected" : ""}
                  onClick={() => onSelectClass(option.value)}
                >
                  {option.label.slice(0, 2)}
                </button>
              ))}
            </div>
          )}

          {isMe && onSelectSkin && skinOptions && skinOptions.length > 1 && (
            <select className="retro-input" value={player.skin} onChange={(e) => onSelectSkin(e.target.value as CharacterSkin)}>
              {skinOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <span className={`retro-ready-badge retro-ready-badge--${player.ready ? "ready" : "waiting"}`}>
            {player.ready ? "✓ พร้อมแล้ว" : "รอ..."}
          </span>
        </>
      )}
    </div>
  );
}
