interface Props {
  active: boolean;
}

// Vignette + "K.O." text over the canvas during the 5s death slowmo (see
// BattleScene.startDeathSequence). Pure presentation -- Phaser owns the
// actual timing via deathBus; this just reflects `active` with a CSS fade.
// pointer-events: none throughout, since there's nothing left to click here.
export function DeathOverlay({ active }: Props) {
  return (
    <div className={`death-overlay ${active ? "death-overlay--active" : ""}`}>
      <span className="death-overlay__ko retro-heading">K.O.</span>
    </div>
  );
}
