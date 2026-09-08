import { Room, Client } from "colyseus";
import {
  ActionMessage,
  ActionType,
  ARENA_WIDTH,
  ATTACK1_ACTIVE_MS,
  ATTACK1_COOLDOWN_MS,
  ATTACK1_DAMAGE,
  ATTACK1_RANGE,
  ATTACK2_ACTIVE_MS,
  ATTACK2_COOLDOWN_MS,
  ATTACK2_DAMAGE,
  ATTACK2_RANGE,
  ATTACK3_ACTIVE_MS,
  ATTACK3_COOLDOWN_MS,
  ATTACK3_DAMAGE,
  ATTACK3_RANGE,
  DEFEND_DAMAGE_MULTIPLIER,
  GRAVITY,
  GROUND_Y,
  JoinOptions,
  JUMP_VELOCITY,
  MATCH_DURATION_SECONDS,
  MAX_HP,
  MessageType,
  MoveInputMessage,
  MOVE_SPEED,
  PLAYER_WIDTH,
  RUN_ATTACK_KNOCKBACK_MS,
  RUN_ATTACK_KNOCKBACK_VX,
  RUN_HOLD_MS,
  RUN_SPEED_MULTIPLIER,
  SERVER_TICK_MS,
  Side,
  SPAWN_X,
} from "@hnd/shared";
import { BattleState } from "../schema/BattleState";
import { PlayerSchema } from "../schema/PlayerSchema";

const RECONNECTION_GRACE_SECONDS = 20;

type AttackSkill = "attack1" | "attack2" | "attack3";

const ATTACK_CONFIG: Record<
  AttackSkill,
  { damage: number; range: number; cooldownMs: number; activeMs: number; lastAtField: "lastAttack1At" | "lastAttack2At" | "lastAttack3At" }
> = {
  attack1: { damage: ATTACK1_DAMAGE, range: ATTACK1_RANGE, cooldownMs: ATTACK1_COOLDOWN_MS, activeMs: ATTACK1_ACTIVE_MS, lastAtField: "lastAttack1At" },
  attack2: { damage: ATTACK2_DAMAGE, range: ATTACK2_RANGE, cooldownMs: ATTACK2_COOLDOWN_MS, activeMs: ATTACK2_ACTIVE_MS, lastAtField: "lastAttack2At" },
  attack3: { damage: ATTACK3_DAMAGE, range: ATTACK3_RANGE, cooldownMs: ATTACK3_COOLDOWN_MS, activeMs: ATTACK3_ACTIVE_MS, lastAtField: "lastAttack3At" },
};

export class BattleRoom extends Room<BattleState> {
  maxClients = 2;

  private hurtUntil = new Map<string, number>();
  private accumulatedMs = 0;

  onCreate() {
    this.setState(new BattleState());
    this.state.timeLeft = MATCH_DURATION_SECONDS;

    this.onMessage(MessageType.Move, (client, message: MoveInputMessage) => {
      const dir = message?.dir;
      if (dir === -1 || dir === 0 || dir === 1) {
        this.setMoveDir(client.sessionId, dir);
      }
    });

    this.onMessage(MessageType.Jump, (client) => {
      this.tryJump(client.sessionId);
    });

    this.onMessage(MessageType.Action, (client, message: ActionMessage) => {
      this.handleAction(client.sessionId, message?.type);
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime), SERVER_TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions) {
    const side = this.resolveSide(options?.side);
    const player = new PlayerSchema();
    player.name = (options?.name || "Player").slice(0, 20);
    player.side = side;
    player.x = SPAWN_X[side];
    player.y = GROUND_Y;
    player.hp = MAX_HP;
    player.maxHp = MAX_HP;
    player.facingLeft = side === "demon";

    this.state.players.set(client.sessionId, player);

    if (this.state.players.size === 2) {
      this.state.status = "playing";
      this.lock();
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = false;

    if (this.state.status !== "playing") return;

    try {
      if (consented) throw new Error("consented leave");
      await this.allowReconnection(client, RECONNECTION_GRACE_SECONDS);
      player.connected = true;
    } catch {
      // Opponent forfeits by disconnecting; the remaining connected player wins.
      const remaining = [...this.state.players.values()].find((p) => p.connected);
      if (this.state.status === "playing") {
        this.state.status = "finished";
        this.state.winner = remaining ? remaining.side : "draw";
      }
    }
  }

  protected resolveSide(requested: Side | undefined): Side {
    const takenSides = new Set([...this.state.players.values()].map((p) => p.side));
    if (requested && !takenSides.has(requested)) return requested;
    const fallback: Side[] = ["hero", "demon"];
    return fallback.find((s) => !takenSides.has(s)) ?? "hero";
  }

  protected setMoveDir(sessionId: string, dir: -1 | 0 | 1) {
    const player = this.state.players.get(sessionId);
    if (!player || this.state.status !== "playing" || player.hp <= 0) return;
    player.moveDir = dir;
  }

  protected tryJump(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player || this.state.status !== "playing" || player.hp <= 0) return;
    if (player.grounded) {
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
    }
  }

  protected getOpponent(sessionId: string): PlayerSchema | undefined {
    const entry = [...this.state.players.entries()].find(([id]) => id !== sessionId);
    return entry?.[1];
  }

  protected handleAction(sessionId: string, type: ActionType | undefined) {
    const player = this.state.players.get(sessionId);
    if (!player || this.state.status !== "playing" || player.hp <= 0 || !type) return;

    if (type === "defendStart") {
      player.defending = true;
      return;
    }
    if (type === "defendStop") {
      player.defending = false;
      return;
    }

    this.handleAttack(sessionId, type);
  }

  protected handleAttack(sessionId: string, skill: AttackSkill) {
    const attacker = this.state.players.get(sessionId);
    if (!attacker || this.state.status !== "playing" || attacker.hp <= 0) return;

    const now = this.clock.currentTime;
    const cfg = ATTACK_CONFIG[skill];
    if (now - attacker[cfg.lastAtField] < cfg.cooldownMs) return; // on cooldown: silent reject, no state change

    attacker[cfg.lastAtField] = now;
    attacker.attackActiveUntil = now + cfg.activeMs;
    attacker.currentSkill = skill;

    const opponent = this.getOpponent(sessionId);
    if (!opponent || opponent.hp <= 0) return;

    const dx = opponent.x - attacker.x;
    const inRange = Math.abs(dx) <= cfg.range;
    const facingCorrect = attacker.facingLeft ? dx < 0 : dx > 0;
    if (!inRange || !facingCorrect) return;

    const damage = opponent.defending ? cfg.damage * DEFEND_DAMAGE_MULTIPLIER : cfg.damage;
    opponent.hp = Math.max(0, opponent.hp - damage);
    this.hurtUntil.set(this.sessionIdOf(opponent), now + cfg.activeMs);

    if (skill === "attack1" && attacker.running) {
      opponent.knockbackVx = attacker.facingLeft ? -RUN_ATTACK_KNOCKBACK_VX : RUN_ATTACK_KNOCKBACK_VX;
      opponent.knockbackUntil = now + RUN_ATTACK_KNOCKBACK_MS;
    }

    if (opponent.hp <= 0) {
      this.state.status = "finished";
      this.state.winner = attacker.side;
    }
  }

  private sessionIdOf(player: PlayerSchema): string {
    for (const [sessionId, p] of this.state.players.entries()) {
      if (p === player) return sessionId;
    }
    return "";
  }

  // Override in a subclass to run per-tick logic (e.g. bot AI) alongside physics.
  protected onTick(_deltaTime: number): void {}

  private update(deltaTime: number) {
    if (this.state.status !== "playing") return;

    this.onTick(deltaTime);

    const dt = deltaTime / 1000;
    const now = this.clock.currentTime;

    for (const [sessionId, player] of this.state.players.entries()) {
      if (player.hp <= 0) {
        player.animState = "dead";
        player.vx = 0;
        continue;
      }

      // Run detection: server-authoritative, derived from how long moveDir has been held.
      if (player.moveDir !== 0) {
        if (player.moveDirSince === 0) player.moveDirSince = now;
        player.running = now - player.moveDirSince > RUN_HOLD_MS;
      } else {
        player.moveDirSince = 0;
        player.running = false;
      }

      // Knockback overrides normal moveDir-driven velocity while active.
      if (now < player.knockbackUntil) {
        player.vx = player.knockbackVx;
      } else {
        const speed = player.running ? MOVE_SPEED * RUN_SPEED_MULTIPLIER : MOVE_SPEED;
        player.vx = player.moveDir * speed;
      }
      if (player.moveDir !== 0) {
        player.facingLeft = player.moveDir === -1;
      }

      player.x += player.vx * dt;
      const halfWidth = PLAYER_WIDTH / 2;
      player.x = Math.max(halfWidth, Math.min(ARENA_WIDTH - halfWidth, player.x));

      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND_Y) {
        player.y = GROUND_Y;
        player.vy = 0;
        player.grounded = true;
      }

      const hurtUntil = this.hurtUntil.get(sessionId) ?? 0;
      const attacking = now < player.attackActiveUntil;
      if (attacking) {
        player.animState = player.currentSkill === "attack1" && player.running ? "runAttack" : player.currentSkill;
      } else if (now < hurtUntil) {
        player.animState = "hurt";
      } else if (player.defending) {
        player.animState = "protect";
      } else if (!player.grounded) {
        player.animState = "jump";
      } else if (player.running) {
        player.animState = "run";
      } else if (player.moveDir !== 0) {
        player.animState = "walk";
      } else {
        player.animState = "idle";
      }
    }

    this.accumulatedMs += deltaTime;
    while (this.accumulatedMs >= 1000) {
      this.accumulatedMs -= 1000;
      this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);
    }

    if (this.state.status === "playing" && this.state.timeLeft <= 0) {
      this.state.status = "finished";
      this.state.winner = this.decideTimeoutWinner();
    }
  }

  private decideTimeoutWinner(): string {
    const players = [...this.state.players.values()];
    if (players.length < 2) return players[0]?.side ?? "draw";
    const [a, b] = players;
    if (a.hp === b.hp) return "draw";
    return a.hp > b.hp ? a.side : b.side;
  }
}
