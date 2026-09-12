import { Client } from "colyseus";
import {
  ATTACK1_RANGE,
  ATTACK2_RANGE,
  ATTACK3_RANGE,
  CharacterClass,
  GROUND_Y,
  JoinOptions,
  MAX_HP,
  SPAWN_X,
} from "@hnd/shared";
import { PlayerSchema } from "../schema/PlayerSchema";
import { BattleRoom, CLASS_SKINS } from "./BattleRoom";

const ALL_CLASSES: CharacterClass[] = ["knight", "ninja", "wizard", "samurai"];
const BOT_START_IN_BOW_CHANCE = 0.3; // only relevant when the bot randomly rolls "samurai"

const BOT_SESSION_ID = "bot";
const BOT_NAME = "AI Bot";
const BOT_DECISION_INTERVAL_MS = 250;
const BOT_APPROACH_DISTANCE = ATTACK1_RANGE * 0.65;
const BOT_ATTACK1_DISTANCE = ATTACK1_RANGE * 0.9;
const BOT_ATTACK2_DISTANCE = ATTACK2_RANGE * 0.9;
const BOT_ATTACK3_DISTANCE = ATTACK3_RANGE * 0.9;
const BOT_JUMP_CHANCE = 0.08;
const BOT_DEFEND_CHANCE = 0.15;
const BOT_DEFEND_DURATION_MS = 500;

// Single-player room: one real client plus a server-controlled bot filling
// the other side, so a solo developer can test a match without a second
// browser tab. Everything else (physics, hit detection, win conditions) is
// inherited unchanged from BattleRoom — only matchmaking size and the bot's
// per-tick decisions are added here.
export class PracticeRoom extends BattleRoom {
  maxClients = 1;

  private nextBotDecisionAt = 0;
  private botDefendUntil = 0;

  onJoin(client: Client, options: JoinOptions) {
    super.onJoin(client, options);
    this.spawnBot();
  }

  private spawnBot() {
    if (this.state.players.has(BOT_SESSION_ID)) return;

    const side = this.resolveSide(undefined);
    const bot = new PlayerSchema();
    bot.name = BOT_NAME;
    bot.side = side;

    const characterClass = ALL_CLASSES[Math.floor(Math.random() * ALL_CLASSES.length)];
    const skinOptions = CLASS_SKINS[characterClass];
    bot.characterClass = characterClass;
    bot.skin = skinOptions[Math.floor(Math.random() * skinOptions.length)];
    bot.weaponType = characterClass === "samurai" && Math.random() < BOT_START_IN_BOW_CHANCE ? "bow" : "sword";

    bot.x = SPAWN_X[side];
    bot.y = GROUND_Y;
    bot.hp = MAX_HP;
    bot.maxHp = MAX_HP;
    bot.facingLeft = side === "demon";

    this.state.players.set(BOT_SESSION_ID, bot);
    this.state.status = "playing";
    this.lock();
  }

  protected onTick(): void {
    const bot = this.state.players.get(BOT_SESSION_ID);
    const opponent = this.getOpponent(BOT_SESSION_ID);
    if (!bot || !opponent || bot.hp <= 0 || opponent.hp <= 0) return;

    const dx = opponent.x - bot.x;
    const dist = Math.abs(dx);
    const now = this.clock.currentTime;

    if (now >= this.botDefendUntil && bot.defending) {
      this.handleAction(BOT_SESSION_ID, "defendStop");
    }

    if (now >= this.nextBotDecisionAt) {
      this.nextBotDecisionAt = now + BOT_DECISION_INTERVAL_MS;

      if (dist > BOT_APPROACH_DISTANCE) {
        this.setMoveDir(BOT_SESSION_ID, dx > 0 ? 1 : -1);
      } else {
        this.setMoveDir(BOT_SESSION_ID, 0);
      }

      if (bot.grounded && Math.random() < BOT_JUMP_CHANCE) {
        this.tryJump(BOT_SESSION_ID);
      }

      if (!bot.defending && dist <= BOT_ATTACK1_DISTANCE && Math.random() < BOT_DEFEND_CHANCE) {
        this.handleAction(BOT_SESSION_ID, "defendStart");
        this.botDefendUntil = now + BOT_DEFEND_DURATION_MS;
      }

      // Paced by the same BOT_DECISION_INTERVAL_MS gate as the rest of the
      // bot's choices above -- this used to run every server tick instead
      // (SERVER_TICK_MS, ~50ms), so it fired the instant any attack's
      // cooldown cleared with zero jitter. handleAttack's own per-skill
      // cooldown still ultimately paces actual hits, but that let the bot
      // attack far more relentlessly/mechanically than intended, and made
      // client-side hit-stop (BattleScene.applyHitStop) trigger dense enough
      // to visibly stick even after being throttled.
      if (dist <= BOT_ATTACK3_DISTANCE) {
        this.handleAction(BOT_SESSION_ID, "attack3");
      } else if (dist <= BOT_ATTACK2_DISTANCE) {
        this.handleAction(BOT_SESSION_ID, "attack2");
      } else if (dist <= BOT_ATTACK1_DISTANCE) {
        this.handleAction(BOT_SESSION_ID, "attack1");
      }
    }
  }
}
