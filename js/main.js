// Punto de entrada del juego.
// Crea el estado, el sonido y la interfaz (compartidos entre reinicios) y arranca Phaser.

import { GameScene } from './scenes/GameScene.js';
import { GameState } from './state/GameState.js';
import { FireAudio } from './audio/FireAudio.js';
import { Ui } from './ui/Ui.js';
import { W, H } from './gfx/textures.js';

const state = new GameState();
state.load();
const audio = new FireAudio();
const ui = new Ui();

// Ajustes guardados (volumen, mute, reducir movimiento). Si faltan, quedan los de fábrica.
const settings = state.data.settings;
if (settings) {
  if (typeof settings.volume === 'number') audio.setVolume?.(settings.volume);
  audio.setMuted?.(!!settings.muted);
  ui.applySettings(settings);
}

// Touch: sin zoom ni scroll del navegador sobre el juego.
const wrap = document.getElementById('wrap');
wrap.addEventListener('contextmenu', (e) => e.preventDefault());
wrap.addEventListener('touchmove', (e) => {
  if (!e.target.closest('input, #panel-list')) e.preventDefault();
}, { passive: false });
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault());

// El navegador solo deja arrancar el audio después de un gesto del usuario.
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

const save = () => state.save();
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0b0806',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.1 },
      enableSleeping: true,
      positionIterations: 10,
      velocityIterations: 8,
    },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);
game.registry.set('state', state);
game.registry.set('audio', audio);
game.registry.set('ui', ui);

// Para depurar desde la consola.
window.fogata = { game, state };
