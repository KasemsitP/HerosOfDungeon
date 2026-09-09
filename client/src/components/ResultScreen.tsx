import { useEffect } from "react";
import { Room } from "colyseus.js";
import { CharacterClass, resolveRenderSkin, Side } from "@hnd/shared";
import { BattleStateView, PlayerView } from "../network/types";
import { CLASS_OPTIONS } from "../characterOptions";
import { SKIN_CONFIGS } from "../game/classConfigs";
import { playDomSound } from "../audio/domAudio";

interface Props {
  room: Room<BattleStateView>;
  winner: string; // "hero" | "demon" | "draw"
  mySide: Side;
  onBackToLobby: () => void;
}

const CLASS_LABELS = Object.fromEntries(CLASS_OPTIONS.map((o) => [o.value, o.label])) as Record<CharacterClass, string>;

function findPlayerBySide(room: Room<BattleStateView>, side: string): PlayerView | undefined {
  let found: PlayerView | undefined;
  room.state.players.forEach((player) => {
    if (player.side === side) found = player;
  });
  return found;
}

export function ResultScreen({ room, winner, mySide, onBackToLobby }: Props) {
  const isDraw = winner === "draw";
  const isViewerWinner = !isDraw && winner === mySide;
  const outcome: "win" | "lose" | "draw" = isDraw ? "draw" : isViewerWinner ? "win" : "lose";
  const headline = isDraw ? "DRAW" : isViewerWinner ? "VICTORY!" : "DEFEAT";

  const winnerPlayer = isDraw ? undefined : findPlayerBySide(room, winner);
  // samurai in bow mode renders a fully separate sprite set (see
  // resolveRenderSkin) -- always resolve through it so the portrait matches
  // what was actually on screen during the match, not the stored skin field.
  const renderSkin = winnerPlayer
    ? resolveRenderSkin(winnerPlayer.characterClass, winnerPlayer.skin, winnerPlayer.weaponType)
    : undefined;
  const idleAnim = renderSkin ? SKIN_CONFIGS[renderSkin].anims.idle : undefined;

  const classLabel = winnerPlayer ? CLASS_LABELS[winnerPlayer.characterClass] : "";
  const sideLabel = winnerPlayer ? winnerPlayer.side.charAt(0).toUpperCase() + winnerPlayer.side.slice(1) : "";
  const archerSuffix = renderSkin === "samurai-bow" ? " (Archer)" : "";

  // Short one-shot jingle on arrival, from the viewer's own perspective --
  // no draw jingle, since neither victory nor defeat fits and one wasn't
  // called for. Plain DOM audio: this screen has no Phaser scene at all.
  useEffect(() => {
    if (outcome === "win") playDomSound("/assets/audio/music/victory.mp3", { volume: 0.6 });
    else if (outcome === "lose") playDomSound("/assets/audio/music/defeat.mp3", { volume: 0.6 });
  }, [outcome]);

  return (
    <div className="retro-screen retro-halftone" style={{ alignItems: "center", justifyContent: "center" }}>
      <div className="retro-panel" style={{ width: 420, padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
        <h1 className={`retro-heading result-headline result-headline--${outcome}`} style={{ fontSize: 36, margin: 0 }}>
          {headline}
        </h1>

        {winnerPlayer && idleAnim && renderSkin && (
          <>
            <div className={`result-portrait-frame result-portrait-frame--${outcome}`}>
              <div
                className="result-portrait-frame__sprite"
                style={{
                  backgroundImage: `url(/assets/sprites/${renderSkin}/${idleAnim.file})`,
                  backgroundSize: `${idleAnim.frames * 100}% 100%`,
                }}
              />
            </div>
            <p style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>{winnerPlayer.name}</p>
            <p style={{ fontSize: 14, color: "var(--retro-muted)", margin: 0 }}>
              {classLabel}
              {archerSuffix} · {sideLabel}
            </p>
          </>
        )}

        {isDraw && <p style={{ fontSize: 14, color: "var(--retro-muted)", margin: 0 }}>No one wins this round.</p>}

        <button className="retro-btn" style={{ marginTop: 8, height: 56, width: "100%" }} onClick={onBackToLobby}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
