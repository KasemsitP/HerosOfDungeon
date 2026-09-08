import { Side } from "@hnd/shared";

interface Props {
  winner: string; // "hero" | "demon" | "draw"
  mySide: Side;
  onBackToLobby: () => void;
}

export function ResultScreen({ winner, mySide, onBackToLobby }: Props) {
  const outcome = winner === "draw" ? "draw" : winner === mySide ? "win" : "lose";
  const heading = outcome === "draw" ? "Draw!" : outcome === "win" ? "Victory!" : "Defeat";

  return (
    <div className={`result-screen result-screen--${outcome}`}>
      <h1>{heading}</h1>
      <p>Winning side: {winner === "draw" ? "Nobody" : winner}</p>
      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}
