import { Client } from "colyseus";
import { JoinOptions, MessageType, SelectCharacterMessage } from "@hnd/shared";
import { BattleRoom } from "./BattleRoom";
import { releaseByRoomId } from "./RoomCodeRegistry";

// Created via server/src/index.ts's POST /api/rooms (matchMaker.createRoom),
// never through normal joinOrCreate matchmaking -- so it's inherently
// private. Reuses 100% of BattleRoom's physics/combat/shield/knockback/
// projectile logic; the only behavioral fork is *when* the match starts:
// quick-match starts the instant the room fills, this waits for the host to
// explicitly call startGame once both players are ready.
export class PrivateRoom extends BattleRoom {
  maxClients = 2;

  onCreate() {
    super.onCreate();

    this.onMessage(MessageType.ToggleReady, (client) => {
      this.handleToggleReady(client.sessionId);
    });

    this.onMessage(MessageType.SelectCharacter, (client, message: SelectCharacterMessage) => {
      this.handleSelectCharacter(client.sessionId, message);
    });

    this.onMessage(MessageType.StartGame, (client) => {
      this.handleStartGame(client.sessionId);
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    super.onJoin(client, options);
    if (!this.state.hostId) this.state.hostId = client.sessionId; // first joiner is host
  }

  onDispose() {
    releaseByRoomId(this.roomId);
  }

  protected onRoomFull() {
    // Intentionally empty -- stay "waiting" until the host starts the match.
  }

  private handleToggleReady(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player || this.state.status !== "waiting") return;
    player.ready = !player.ready;
  }

  private handleSelectCharacter(sessionId: string, message: SelectCharacterMessage | undefined) {
    const player = this.state.players.get(sessionId);
    if (!player || this.state.status !== "waiting") return;

    player.characterClass = this.resolveClass(message?.characterClass);
    player.skin = this.resolveSkin(player.characterClass, message?.skin);
    player.weaponType = "sword";
    player.ready = false; // changing your pick un-readies you
  }

  private handleStartGame(sessionId: string) {
    if (this.state.status !== "waiting") return;
    if (sessionId !== this.state.hostId) return;
    if (this.state.players.size !== 2) return;
    if (![...this.state.players.values()].every((p) => p.ready)) return;

    this.state.status = "playing";
  }
}
