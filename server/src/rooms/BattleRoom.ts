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
  AttackSkill,
  CharacterClass,
  CharacterSkin,
  DEFEND_DAMAGE_MULTIPLIER,
  getAttackMode,
  GRAVITY,
  GROUND_Y,
  HitAttackType,
  HIT_EVENT,
  JoinOptions,
  JUMP_VELOCITY,
  KNOCKBACK_FORCE_BLOCK,
  KNOCKBACK_FORCE_HIT,
  KNOCKBACK_FRICTION,
  KNOCKBACK_STOP_THRESHOLD,
  MATCH_DURATION_SECONDS,
  MAX_HP,
  MessageType,
  MoveInputMessage,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PROJECTILE_HIT_RADIUS,
  PROJECTILE_MAX_LIFETIME_MS,
  PROJECTILE_SPEED,
  RECONNECT_GRACE_SECONDS,
  RUN_ATTACK_ACTIVE_MS,
  RUN_ATTACK_KNOCKBACK_VX,
  RUN_HOLD_MS,
  RUN_SPEED_MULTIPLIER,
  SERVER_TICK_MS,
  SHIELD_BREAK_COOLDOWN_MS,
  SHIELD_MAX_DURABILITY,
  Side,
  SPAWN_X,
  WEAPON_SWITCH_LOCKOUT_MS,
} from "@hnd/shared";
import { BattleState } from "../schema/BattleState";
import { PlayerSchema } from "../schema/PlayerSchema";
import { ProjectileSchema } from "../schema/ProjectileSchema";

const ATTACK_CONFIG: Record<
  AttackSkill,
  { damage: number; range: number; cooldownMs: number; activeMs: number; lastAtField: "lastAttack1At" | "lastAttack2At" | "lastAttack3At" }
> = {
  attack1: { damage: ATTACK1_DAMAGE, range: ATTACK1_RANGE, cooldownMs: ATTACK1_COOLDOWN_MS, activeMs: ATTACK1_ACTIVE_MS, lastAtField: "lastAttack1At" },
  attack2: { damage: ATTACK2_DAMAGE, range: ATTACK2_RANGE, cooldownMs: ATTACK2_COOLDOWN_MS, activeMs: ATTACK2_ACTIVE_MS, lastAtField: "lastAttack2At" },
  attack3: { damage: ATTACK3_DAMAGE, range: ATTACK3_RANGE, cooldownMs: ATTACK3_COOLDOWN_MS, activeMs: ATTACK3_ACTIVE_MS, lastAtField: "lastAttack3At" },
};

export const CLASS_SKINS: Record<CharacterClass, CharacterSkin[]> = {
  knight: ["knight-1", "knight-2", "knight-3"],
  ninja: ["ninja-1", "ninja-2", "ninja-3"],
  wizard: ["wizard-1", "wizard-2", "wizard-3"],
  samurai: ["samurai-1", "samurai-2"],
};

const PROJECTILE_TYPE: Record<CharacterClass, "kunai" | "arrow" | "bolt"> = {
  knight: "bolt", // unused -- knight is always melee
  ninja: "kunai",
  wizard: "bolt",
  samurai: "arrow", // only reachable in bow mode
};

export class BattleRoom extends Room<BattleState> {
  maxClients = 2;

  private hurtUntil = new Map<string, number>();
  private knockbackVelocity = new Map<string, number>(); // signed px/s, decays via friction
  private knockbackFacing = new Map<string, boolean>(); // facingLeft to hold while knockback is active
  private shieldRecoveryAt = new Map<string, number>(); // sessionId -> timestamp when shield resets
  private projectileSpawnedAt = new Map<string, number>(); // projectile id -> spawn timestamp, for lifetime expiry
  private nextProjectileId = 0;
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

    this.onMessage(MessageType.SwitchWeapon, (client) => {
      this.handleSwitchWeapon(client.sessionId);
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime), SERVER_TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions) {
    const side = this.resolveSide(options?.side);
    const characterClass = this.resolveClass(options?.characterClass);
    const player = new PlayerSchema();
    player.name = (options?.name || "Player").slice(0, 20);
    player.side = side;
    player.characterClass = characterClass;
    // "samurai-bow" isn't a stored skin (samurai's look is always a sword
    // skin) -- picking it in the Lobby means "start in bow mode", so treat
    // it as a signal rather than validate it as one of the sword-mode skins.
    const startInBow = characterClass === "samurai" && options?.skin === "samurai-bow";
    player.skin = this.resolveSkin(characterClass, startInBow ? undefined : options?.skin);
    player.weaponType = startInBow ? "bow" : "sword";
    player.x = SPAWN_X[side];
    player.y = GROUND_Y;
    player.hp = MAX_HP;
    player.maxHp = MAX_HP;
    player.facingLeft = side === "demon";

    this.state.players.set(client.sessionId, player);

    if (this.state.players.size === 2) {
      this.lock();
      this.onRoomFull();
    }
  }

  // Quick-match/practice start the instant the room fills. PrivateRoom
  // overrides this to stay "waiting" until the host explicitly starts.
  protected onRoomFull() {
    this.state.status = "playing";
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = false;

    if (this.state.status !== "playing") return;

    try {
      if (consented) throw new Error("consented leave");
      await this.allowReconnection(client, RECONNECT_GRACE_SECONDS);
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

  protected resolveClass(requested: CharacterClass | undefined): CharacterClass {
    const validClasses: CharacterClass[] = ["knight", "ninja", "wizard", "samurai"];
    return requested && validClasses.includes(requested) ? requested : "knight";
  }

  protected resolveSkin(characterClass: CharacterClass, requested: CharacterSkin | undefined): CharacterSkin {
    const validSkins = CLASS_SKINS[characterClass];
    return requested && validSkins.includes(requested) ? requested : validSkins[0];
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
      if (getAttackMode(player.characterClass, player.weaponType) === "ranged") return; // ranged classes/modes can't block
      if (player.shieldBroken) return; // broken shield: reject, even if a modified client keeps sending this
      player.defending = true;
      return;
    }
    if (type === "defendStop") {
      player.defending = false;
      return;
    }

    this.handleAttack(sessionId, type);
  }

  protected handleSwitchWeapon(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player || this.state.status !== "playing" || player.hp <= 0) return;
    if (player.characterClass !== "samurai") return;

    const now = this.clock.currentTime;
    if (now - player.lastWeaponSwitchAt < WEAPON_SWITCH_LOCKOUT_MS) return;
    if (now < player.attackActiveUntil) return; // can't switch mid-swing

    player.weaponType = player.weaponType === "sword" ? "bow" : "sword";
    player.lastWeaponSwitchAt = now;

    if (getAttackMode(player.characterClass, player.weaponType) === "ranged") {
      player.defending = false; // bow mode can't block
    }
  }

  protected handleAttack(sessionId: string, skill: AttackSkill) {
    const attacker = this.state.players.get(sessionId);
    if (!attacker || this.state.status !== "playing" || attacker.hp <= 0) return;

    const now = this.clock.currentTime;
    const cfg = ATTACK_CONFIG[skill];
    if (now - attacker[cfg.lastAtField] < cfg.cooldownMs) return; // on cooldown: silent reject, no state change

    const attackMode = getAttackMode(attacker.characterClass, attacker.weaponType);
    const isRunAttack = attackMode === "melee" && skill === "attack1" && attacker.running;
    const activeMs = isRunAttack ? RUN_ATTACK_ACTIVE_MS : cfg.activeMs;

    attacker[cfg.lastAtField] = now;
    attacker.attackActiveUntil = now + activeMs;
    attacker.currentSkill = skill;

    if (attackMode === "ranged") {
      this.spawnProjectile(attacker, sessionId, cfg.damage, skill);
      return;
    }

    const opponent = this.getOpponent(sessionId);
    if (!opponent || opponent.hp <= 0) return;

    const dx = opponent.x - attacker.x;
    const inRange = Math.abs(dx) <= cfg.range;
    const facingCorrect = attacker.facingLeft ? dx < 0 : dx > 0;
    if (!inRange || !facingCorrect) return;

    const knockbackForce = isRunAttack ? RUN_ATTACK_KNOCKBACK_VX : KNOCKBACK_FORCE_HIT;
    this.resolveHit(sessionId, opponent, cfg.damage, knockbackForce, activeMs, isRunAttack ? "runAttack" : skill);
  }

  // Ranged attacks always fire (no range/facing gate up front) -- whether it
  // actually lands is decided later, incrementally, as the projectile
  // travels and is checked against the opponent each tick in update().
  protected spawnProjectile(attacker: PlayerSchema, ownerId: string, damage: number, skill: AttackSkill) {
    const projectile = new ProjectileSchema();
    projectile.ownerId = ownerId;
    projectile.x = attacker.x;
    projectile.y = attacker.y - PLAYER_HEIGHT / 2;
    projectile.vx = (attacker.facingLeft ? -1 : 1) * PROJECTILE_SPEED;
    projectile.damage = damage;
    projectile.projectileType = PROJECTILE_TYPE[attacker.characterClass];
    projectile.skill = skill; // carried through to hitEvent's attackType when this lands (see update())

    const id = `p${this.nextProjectileId++}`;
    this.projectileSpawnedAt.set(id, this.clock.currentTime);
    this.state.projectiles.set(id, projectile);
  }

  // Applies a hit's outcome to the target: damage (reduced + shield-drained if
  // blocking), knockback, and shield-break/recovery. Block force is always
  // KNOCKBACK_FORCE_BLOCK regardless of attack type; hitKnockbackForce is only
  // used for the unblocked case (normal hit vs. the stronger run+attack).
  protected resolveHit(
    attackerSessionId: string,
    target: PlayerSchema,
    rawDamage: number,
    hitKnockbackForce: number,
    activeMs: number,
    attackType: HitAttackType
  ) {
    const attacker = this.state.players.get(attackerSessionId);
    if (!attacker) return;
    const targetSessionId = this.sessionIdOf(target);
    const now = this.clock.currentTime;

    const isBlocking = target.defending && !target.shieldBroken;
    const dx = target.x - attacker.x;
    const knockbackDir: -1 | 1 = dx >= 0 ? 1 : -1; // push target away from attacker
    const facingTowardAttacker = knockbackDir === 1; // face back toward whoever hit you, not the push direction

    let appliedDamage: number;
    if (isBlocking) {
      appliedDamage = Math.round(rawDamage * DEFEND_DAMAGE_MULTIPLIER);
      target.hp = Math.max(0, target.hp - appliedDamage);
      target.shieldDurability = Math.max(0, target.shieldDurability - rawDamage); // full raw damage, not the reduced amount
      this.applyKnockback(targetSessionId, knockbackDir * KNOCKBACK_FORCE_BLOCK, facingTowardAttacker);

      if (target.shieldDurability <= 0) {
        target.shieldBroken = true;
        target.defending = false; // force-cancel the current block immediately
        this.shieldRecoveryAt.set(targetSessionId, now + SHIELD_BREAK_COOLDOWN_MS);
      }
    } else {
      appliedDamage = rawDamage;
      target.hp = Math.max(0, target.hp - rawDamage);
      this.hurtUntil.set(targetSessionId, now + activeMs);
      this.applyKnockback(targetSessionId, knockbackDir * hitKnockbackForce, facingTowardAttacker);
    }

    const targetDied = target.hp <= 0;
    if (targetDied) {
      // The tick that would normally set animState="dead" never runs once
      // status flips away from "playing" (update() returns immediately), so
      // set it here or the target freezes in whatever pose they died in.
      // Winner is decided once per tick at the end of update() instead of
      // here, so a simultaneous double-KO (both hit each other's still-in-
      // flight attack the same tick) resolves as a draw instead of whichever
      // resolveHit call happened to run second overwriting the winner.
      target.animState = "dead";
      target.vx = 0;
    }

    // One-off broadcast, deliberately not a schema field -- a landed hit is
    // momentary, and a client that reconnects mid-match must not see a stale
    // hit still sitting in synced state and misfire sound/damage-number/shake
    // for something that isn't actually happening right now.
    this.broadcast(HIT_EVENT, {
      targetId: targetSessionId,
      damage: appliedDamage,
      wasBlocked: isBlocking,
      attackType,
      x: target.x,
      y: target.y,
      targetDied,
    });
  }

  protected applyKnockback(sessionId: string, signedVelocity: number, facingLeft: boolean) {
    this.knockbackVelocity.set(sessionId, signedVelocity);
    this.knockbackFacing.set(sessionId, facingLeft);
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

      const recoverAt = this.shieldRecoveryAt.get(sessionId);
      if (recoverAt !== undefined && now >= recoverAt) {
        player.shieldDurability = SHIELD_MAX_DURABILITY;
        player.shieldBroken = false;
        this.shieldRecoveryAt.delete(sessionId);
      }

      // Run detection: server-authoritative, derived from how long moveDir has been held.
      if (player.moveDir !== 0) {
        if (player.moveDirSince === 0) player.moveDirSince = now;
        player.running = now - player.moveDirSince > RUN_HOLD_MS;
      } else {
        player.moveDirSince = 0;
        player.running = false;
      }

      // Knockback overrides normal moveDir-driven velocity and facing while
      // active, decaying via friction until it drops below the stop threshold.
      const knockback = this.knockbackVelocity.get(sessionId) ?? 0;
      if (knockback !== 0) {
        player.vx = knockback;
        player.facingLeft = this.knockbackFacing.get(sessionId) ?? player.facingLeft;

        // Clamp at zero instead of letting the subtraction cross past it --
        // KNOCKBACK_FRICTION*dt (120 px/s per tick) is larger than
        // KNOCKBACK_STOP_THRESHOLD (20), so an unclamped step overshoots the
        // zero-crossing and flips sign every tick (e.g. 20 -> -100 -> 20 ->
        // -100 ...), which never satisfies `abs(next) < threshold` and pins
        // player.vx to that oscillating knockback value forever -- the
        // player's own moveDir input never gets a chance to drive vx again.
        const decay = KNOCKBACK_FRICTION * dt;
        const next = knockback > 0 ? Math.max(0, knockback - decay) : Math.min(0, knockback + decay);
        if (Math.abs(next) < KNOCKBACK_STOP_THRESHOLD) {
          this.knockbackVelocity.delete(sessionId);
          this.knockbackFacing.delete(sessionId);
        } else {
          this.knockbackVelocity.set(sessionId, next);
        }
      } else {
        // Always face the opponent (standard 1v1 fighting-game convention) --
        // this used to only update while actively moving in that direction,
        // so backing away while attacking (the natural way to play a ranged
        // class -- kiting) left the character facing away from their target.
        // Melee's facing gate in handleAttack and every projectile's fire
        // direction both key off this, so a stale facing meant attacks fired
        // into empty space behind the player instead of at the opponent.
        const opponent = this.getOpponent(sessionId);
        if (opponent) {
          player.facingLeft = opponent.x < player.x;
        }

        if (player.defending) {
          // Blocking holds ground completely -- no walking or running while defending.
          player.vx = 0;
        } else {
          const speed = player.running ? MOVE_SPEED * RUN_SPEED_MULTIPLIER : MOVE_SPEED;
          player.vx = player.moveDir * speed;
        }
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

    for (const [id, projectile] of this.state.projectiles.entries()) {
      const prevX = projectile.x;
      projectile.x += projectile.vx * dt;

      const spawnedAt = this.projectileSpawnedAt.get(id) ?? now;
      const expired = now - spawnedAt > PROJECTILE_MAX_LIFETIME_MS;
      const outOfBounds = projectile.x < 0 || projectile.x > ARENA_WIDTH;

      const target = this.getOpponent(projectile.ownerId);
      // target.y is feet-anchored ground position (see PLAYER_HEIGHT doc at
      // its declaration), but the projectile travels at chest height
      // (attacker.y - PLAYER_HEIGHT / 2, set in spawnProjectile) -- comparing
      // straight against target.y put the hit window's own center on the
      // target's feet instead of their torso, so a projectile flying through
      // dead center would sit exactly on the boundary of `< PLAYER_HEIGHT / 2`
      // and whiff. Compare against the target's center-of-mass instead.
      const targetCenterY = target ? target.y - PLAYER_HEIGHT / 2 : 0;
      const halfW = PLAYER_WIDTH / 2 + PROJECTILE_HIT_RADIUS;
      // Swept check across this tick's full travel (prevX..x), not just the
      // landing point -- a point-only check tunnels through the target
      // whenever a tick's step approaches the hit window's width (a future
      // speed bump or slower tick rate). Y doesn't need sweeping: projectiles
      // never move vertically mid-flight (see spawnProjectile).
      const travelMin = Math.min(prevX, projectile.x);
      const travelMax = Math.max(prevX, projectile.x);
      const hit =
        target &&
        target.hp > 0 &&
        travelMax >= target.x - halfW &&
        travelMin <= target.x + halfW &&
        Math.abs(projectile.y - targetCenterY) < PLAYER_HEIGHT / 2;

      if (hit) {
        this.resolveHit(projectile.ownerId, target!, projectile.damage, KNOCKBACK_FORCE_HIT, ATTACK1_ACTIVE_MS, projectile.skill);
        this.state.projectiles.delete(id);
        this.projectileSpawnedAt.delete(id);
      } else if (expired || outOfBounds) {
        this.state.projectiles.delete(id);
        this.projectileSpawnedAt.delete(id);
      }
    }

    if (this.state.status === "playing") {
      const deathWinner = this.decideDeathWinner();
      if (deathWinner !== undefined) {
        this.state.status = "finished";
        this.state.winner = deathWinner;
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

  // Evaluated once per tick, after every hit this tick has already been
  // applied, so a double-KO (both players' HP hit 0 the same tick) resolves
  // as "draw" instead of racing on whichever resolveHit call ran last.
  private decideDeathWinner(): string | undefined {
    const players = [...this.state.players.values()];
    const dead = players.filter((p) => p.hp <= 0);
    if (dead.length === 0) return undefined;
    if (dead.length === players.length) return "draw";
    return players.find((p) => p.hp > 0)?.side;
  }

  private decideTimeoutWinner(): string {
    const players = [...this.state.players.values()];
    if (players.length < 2) return players[0]?.side ?? "draw";
    const [a, b] = players;
    if (a.hp === b.hp) return "draw";
    return a.hp > b.hp ? a.side : b.side;
  }
}
