interface Props {
  label: string;
}

// Same pixel-corner box look as the real skill buttons in the battle HUD
// (see .cooldown in retro.css / CooldownIndicator.tsx) so a player who
// learns a key here recognizes the exact same shape in the actual game.
// Deliberately its own class rather than reusing .cooldown directly --
// .cooldown is sized for the HUD (56px) and carries cooldown-fill/ready
// state that doesn't apply here.
export function KeyBadge({ label }: Props) {
  return (
    <div className="key-badge">
      <span className="key-badge__label">{label}</span>
    </div>
  );
}
