import { useCallback, useState } from "react";
import { Room } from "colyseus.js";
import { Side } from "@hnd/shared";
import { joinBattle, joinPractice } from "./network/ColyseusClient";
import { BattleStateView } from "./network/types";
import { Lobby } from "./components/Lobby";
import { BattleScreen } from "./components/BattleScreen";
import { ResultScreen } from "./components/ResultScreen";
import "./App.css";

type Screen = "lobby" | "battle" | "result";

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [room, setRoom] = useState<Room<BattleStateView> | null>(null);
  const [mySide, setMySide] = useState<Side>("hero");
  const [winner, setWinner] = useState<string>("");

  const connect = useCallback(
    async (joiner: (options: { name: string; side: Side }) => Promise<Room<BattleStateView>>, name: string, side: Side) => {
      setConnectionStatus("connecting");
      setErrorMessage(undefined);
      try {
        const joinedRoom = await joiner({ name, side });
        const assignedSide = joinedRoom.state.players.get(joinedRoom.sessionId)?.side ?? side;

        joinedRoom.onLeave(() => {
          setRoom(null);
          setScreen((current) => (current === "battle" ? "lobby" : current));
        });

        setRoom(joinedRoom);
        setMySide(assignedSide);
        setConnectionStatus("idle");
        setScreen("battle");
      } catch (err) {
        setConnectionStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not connect to server.");
      }
    },
    []
  );

  const handleFindMatch = useCallback((name: string, side: Side) => connect(joinBattle, name, side), [connect]);
  const handlePractice = useCallback((name: string, side: Side) => connect(joinPractice, name, side), [connect]);

  const handleMatchFinished = useCallback(
    (finishedWinner: string) => {
      setWinner(finishedWinner);
      setScreen("result");
    },
    []
  );

  const handleBackToLobby = useCallback(() => {
    room?.leave();
    setRoom(null);
    setScreen("lobby");
  }, [room]);

  if (screen === "battle" && room) {
    return <BattleScreen room={room} mySide={mySide} onMatchFinished={handleMatchFinished} />;
  }

  if (screen === "result") {
    return <ResultScreen winner={winner} mySide={mySide} onBackToLobby={handleBackToLobby} />;
  }

  return (
    <Lobby
      onFindMatch={handleFindMatch}
      onPractice={handlePractice}
      status={connectionStatus}
      errorMessage={errorMessage}
    />
  );
}
