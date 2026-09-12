import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_CODE_TTL_MS } from "@hnd/shared";

interface CodeEntry {
  roomId: string;
  expiresAt: number;
}

// Plain in-memory maps -- a module-level singleton for the life of the
// server process. Fine for a single-instance MVP; would move to Redis (keyed
// the same way) if this ever ran across multiple server instances.
const codeToEntry = new Map<string, CodeEntry>();
const roomIdToCode = new Map<string, string>();

function randomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function registerCode(roomId: string): string {
  let code = randomCode();
  while (codeToEntry.has(code)) code = randomCode(); // collision guard -- 32^6 combos, but cheap to check
  codeToEntry.set(code, { roomId, expiresAt: Date.now() + ROOM_CODE_TTL_MS });
  roomIdToCode.set(roomId, code);
  return code;
}

export function resolveCode(code: string): string | undefined {
  const entry = codeToEntry.get(code.toUpperCase());
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    releaseByRoomId(entry.roomId);
    return undefined;
  }
  return entry.roomId;
}

export function releaseByRoomId(roomId: string): void {
  const code = roomIdToCode.get(roomId);
  if (!code) return;
  codeToEntry.delete(code);
  roomIdToCode.delete(roomId);
}
