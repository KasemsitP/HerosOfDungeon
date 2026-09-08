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
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      parent: containerRef.current,
      pixelArt: true, // disables antialiasing/uses NEAREST filtering so sprites stay crisp
      roundPixels: true, // snaps sprite positions to whole pixels, avoiding shimmer while moving
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [PreloadScene, BattleScene],
    });

    game.scene.start("PreloadScene", { room });
    gameRef.current = game;

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [room]);

  return <div ref={containerRef} className="phaser-container" />;
}
