import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Room } from "colyseus.js";
import { ARENA_HEIGHT, ARENA_WIDTH } from "@hnd/shared";
import { BattleStateView } from "../network/types";
import { PreloadScene } from "./scenes/PreloadScene";
import { BattleScene } from "./scenes/BattleScene";

interface Props {
  room: Room<BattleStateView>;
}

export function PhaserGame({ room }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      pixelArt: true, // disables antialiasing/uses NEAREST filtering so sprites stay crisp
      roundPixels: true, // snaps sprite positions to whole pixels, avoiding shimmer while moving
      // FIT (not RESIZE): the arena's logical size (1280x480, shared/constants.ts)
      // is fixed -- every server-authoritative position/range/spawn-point
      // assumes that fixed coordinate space. RESIZE would change the world's
      // actual logical size to match the window, which conflicts with that.
      // FIT instead scales the fixed-size canvas to fill the window
      // (letterboxing if the aspect ratio doesn't match) without touching
      // the coordinate space, so no server or physics code needs to change.
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: ARENA_WIDTH,
        height: ARENA_HEIGHT,
      },
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [PreloadScene, BattleScene],
    });

    // Phaser auto-starts the first scene in `scene: [...]` on its own (with
    // no data) -- calling scene.start("PreloadScene", ...) again here would
    // race that auto-boot and run PreloadScene twice. Thread `room` through
    // the registry instead, which every scene can read once it's actually running.
    game.registry.set("room", room);
    gameRef.current = game;

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [room]);

  return <div ref={containerRef} className="phaser-container" />;
}
