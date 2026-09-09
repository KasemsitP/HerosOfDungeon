export interface ControlEntry {
  keys: string[]; // rendered one KeyBadge per entry; empty array = no key icon, text-only row
  label: string;
  detail: string;
}

export interface ControlSection {
  title: string;
  entries: ControlEntry[];
}

// Content for ControlsScreen.tsx. Kept as data (not inline JSX) so a balance
// change (e.g. a cooldown tweak in shared/constants.ts) or a new class only
// needs an edit here -- the screen component itself never changes.
//
// Numbers below are pulled from shared/src/constants.ts and shared/src/types.ts
// (getAttackMode) at the time this was written -- if those change, update here too:
// RUN_HOLD_MS=200, ATTACK1_COOLDOWN_MS=400, ATTACK2_COOLDOWN_MS=3000,
// ATTACK3_COOLDOWN_MS=6000, DEFEND_DAMAGE_MULTIPLIER=0.3, SHIELD_MAX_DURABILITY=100,
// SHIELD_BREAK_COOLDOWN_MS=5000, WEAPON_SWITCH_LOCKOUT_MS=300.
export const CONTROLS_CONFIG: ControlSection[] = [
  {
    title: "การเคลื่อนที่",
    entries: [
      { keys: ["←", "→"], label: "เดิน / วิ่ง", detail: "กดค้างทิศเดิม > 200ms = วิ่ง (เร็วขึ้น 1.6 เท่า)" },
      { keys: ["↑", "Spc"], label: "กระโดด", detail: "" },
    ],
  },
  {
    title: "การโจมตี",
    entries: [
      { keys: ["Z"], label: "โจมตีธรรมดา (สกิล 1)", detail: "cooldown สั้นมาก (0.4 วินาที)" },
      { keys: ["X"], label: "สกิล 2", detail: "cooldown 3 วินาที" },
      { keys: ["C"], label: "สกิล 3", detail: "cooldown 6 วินาที" },
      { keys: ["วิ่ง", "+", "Z"], label: "โจมตีพิเศษระหว่างวิ่ง", detail: "แรงผลักดันสูงกว่าโจมตีปกติ" },
    ],
  },
  {
    title: "การป้องกัน",
    entries: [
      { keys: ["↓"], label: "ป้องกัน (กดค้าง)", detail: "ลดดาเมจที่ได้รับ 70% — ใช้ได้เฉพาะคลาสระยะประชิดเท่านั้น" },
      { keys: [], label: "ความทนทานโล่", detail: "100 แต้ม โดนสะสมจนหมดจะพัง ต้องรอฟื้นตัว 5 วินาทีก่อนป้องกันได้อีกครั้ง" },
    ],
  },
  {
    title: "ความสามารถเฉพาะคลาส",
    entries: [
      { keys: [], label: "Knight", detail: "โจมตีระยะประชิดล้วน ป้องกันได้ทุกท่า" },
      { keys: [], label: "Ninja", detail: "โจมตีทุกท่าเป็นการขว้างกริช (ระยะไกล) — ป้องกันไม่ได้" },
      { keys: [], label: "Wizard", detail: "โจมตีทุกท่าเป็นการร่ายเวทระยะไกล — ป้องกันไม่ได้" },
      { keys: ["V"], label: "Samurai", detail: "สลับโหมดดาบ (ประชิด, ป้องกันได้) / ธนู (ระยะไกล, ป้องกันไม่ได้) สลับได้ทุก 0.3 วินาที" },
    ],
  },
];
