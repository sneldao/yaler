import Phaser from 'phaser';
import { KitchenScene, type GameMode } from './scenes/KitchenScene';
import { COLORS } from './theme';

export function createGame(parent: HTMLElement, mode: GameMode = 'yaler'): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 480,
    height: 270,
    pixelArt: true,
    backgroundColor: COLORS.paper,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [new KitchenScene(mode)],
  };

  return new Phaser.Game(config);
}
