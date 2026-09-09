import { CharacterClass, CharacterSkin } from "@hnd/shared";

export const CLASS_OPTIONS: { value: CharacterClass; label: string }[] = [
  { value: "knight", label: "Knight" },
  { value: "ninja", label: "Ninja" },
  { value: "wizard", label: "Wizard" },
  { value: "samurai", label: "Samurai" },
];

// "Samurai (Archer)" starts the match already in bow mode (Samurai_Archer's
// sprite set) instead of picking a sword-mode look -- switching back to
// sword with V mid-match falls back to the Samurai 1 look, since the bow
// mode isn't tied to either sword skin.
export const CLASS_SKINS: Record<CharacterClass, { value: CharacterSkin; label: string }[]> = {
  knight: [
    { value: "knight-1", label: "Knight 1" },
    { value: "knight-2", label: "Knight 2" },
    { value: "knight-3", label: "Knight 3" },
  ],
  ninja: [
    { value: "ninja-1", label: "Ninja 1" },
    { value: "ninja-2", label: "Ninja 2" },
    { value: "ninja-3", label: "Ninja 3" },
  ],
  wizard: [
    { value: "wizard-1", label: "Wizard 1" },
    { value: "wizard-2", label: "Wizard 2" },
    { value: "wizard-3", label: "Wizard 3" },
  ],
  samurai: [
    { value: "samurai-1", label: "Samurai 1" },
    { value: "samurai-2", label: "Samurai 2" },
    { value: "samurai-bow", label: "Samurai (Archer)" },
  ],
};

export function defaultSkinFor(characterClass: CharacterClass): CharacterSkin {
  return CLASS_SKINS[characterClass][0].value;
}
