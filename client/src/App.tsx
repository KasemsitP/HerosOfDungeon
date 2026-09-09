import { useCallback, useState } from "react";
import { Room } from "colyseus.js";
import { CharacterClass, CharacterSkin, Side } from "@hnd/shared";
import { joinBattle, joinPractice } from "./network/colyseusClient";
import { BattleStateView } from "./network/types";
import { Lobby } from "./components/Lobby";
import { MainMenu } from "./components/MainMenu";
import { CreateRoomModal } from "./components/CreateRoomModal";
import { JoinRoomModal } from "./components/JoinRoomModal";
import { RoomLobby } from "./components/RoomLobby";
import { BattleScreen } from "./components/BattleScreen";
import { ResultScreen } from "./components/ResultScreen";
import { ControlsScreen } from "./components/ControlsScreen";
import "./theme/retro.css";
import "./App.css";

type Screen = "mainMenu" | "quickMatchSetup" | "roomLobby" | "battle" | "result" | "controls";
type Modal = "create" | "join" | null;

export default function App() {
  const [screen, setScreen] = useState<Screen>("mainMenu");
  const [modal, setModal] = useState<Modal>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [room, setRoom] = useState<Room<BattleStateView> | null>(null);
  const [mySide, setMySide] = useState<Side>("hero");
  const [winner, setWinner] = useState<string>("");

  const enterRoom = useCallback((joinedRoom: Room<BattleStateView>, side: Side, nextScreen: Screen) => {
    joinedRoom.onLeave(() => {
      setRoom(null);
      setScreen("mainMenu");
    });
    setRoom(joinedRoom);
    setMySide(side);
    setScreen(nextScreen);
  }, []);

  const connect = useCallback(
    async (
      joiner: (options: {
        name: string;
        side: Side;
        characterClass: CharacterClass;
        skin: CharacterSkin;
      }) => Promise<Room<BattleStateView>>,
      name: string,
      side: Side,
      characterClass: CharacterClass,
      skin: CharacterSkin
    ) => {
      setConnectionStatus("connecting");
      setErrorMessage(undefined);
      try {
        const joinedRoom = await joiner({ name, side, characterClass, skin });
        const assignedSide = joinedRoom.state.players.get(joinedRoom.sessionId)?.side ?? side;
        enterRoom(joinedRoom, assignedSide, "battle");
        setConnectionStatus("idle");
      } catch (err) {
        setConnectionStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not connect to server.");
      }
    },
    [enterRoom]
  );

  const handleFindMatch = useCallback(
    (name: string, side: Side, characterClass: CharacterClass, skin: CharacterSkin) =>
      connect(joinBattle, name, side, characterClass, skin),
    [connect]
  );
  const handlePractice = useCallback(
    (name: string, side: Side, characterClass: CharacterClass, skin: CharacterSkin) =>
      connect(joinPractice, name, side, characterClass, skin),
    [connect]
  );

  const handleMatchFinished = useCallback((finishedWinner: string) => {
    setWinner(finishedWinner);
    setScreen("result");
  }, []);

  const handleBackToMenu = useCallback(() => {
    room?.leave();
    setRoom(null);
    setModal(null);
    setScreen("mainMenu");
  }, [room]);

  if (screen === "battle" && room) {
    return <BattleScreen room={room} mySide={mySide} onMatchFinished={handleMatchFinished} onBackToMenu={handleBackToMenu} />;
  }

  if (screen === "result" && room) {
    return <ResultScreen room={room} winner={winner} mySide={mySide} onBackToLobby={handleBackToMenu} />;
  }

  if (screen === "roomLobby" && room) {
    return <RoomLobby room={room} onGameStart={() => setScreen("battle")} onLeaveRoom={handleBackToMenu} />;
  }

  if (screen === "controls") {
    return <ControlsScreen onBack={() => setScreen("mainMenu")} />;
  }

  if (screen === "quickMatchSetup") {
    return (
      <Lobby
        onFindMatch={handleFindMatch}
        onPractice={handlePractice}
        status={connectionStatus}
        errorMessage={errorMessage}
      />
    );
  }

  // mainMenu, with create/join room rendered as an overlay on top of it.
  return (
    <>
      <MainMenu
        onQuickMatch={() => setScreen("quickMatchSetup")}
        onCreateRoom={() => setModal("create")}
        onJoinRoom={() => setModal("join")}
        onControls={() => setScreen("controls")}
      />
      {modal === "create" && (
        <CreateRoomModal
          onRoomReady={(joinedRoom, side) => {
            setModal(null);
            enterRoom(joinedRoom, side, "roomLobby");
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "join" && (
        <JoinRoomModal
          onJoined={(joinedRoom, side) => {
            setModal(null);
            enterRoom(joinedRoom, side, "roomLobby");
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}
