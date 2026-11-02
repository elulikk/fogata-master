// Arnés de pruebas de física: pegar en la consola con el juego abierto en http://127.0.0.1:8080/ .
// Define window.H = { S, step, pe, clear, put, up, shot, pit }. Anula state.save y bloquea la partida.
window.H = (() => {
  const G = window.fogata.game;
  const S = G.scene.scenes.find((s) => s.fire);
  const c = G.canvas;
  c.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720, x: 0, y: 0 });
  G.scale.refresh();
  window.fogata.state.save = () => false;
  window.fogata.state.locked = true;
  let vt = performance.now();
  const step = (k = 1) => {
    for (let i = 0; i < k; i++) {
      if (S.paused || S.matter.world.enabled === false) S.setPaused(false);
      vt += 16.667; G.loop.delta = 16.667; G.step(vt, 16.667);
    }
  };
  const pe = (t, x, y) => c.dispatchEvent(new MouseEvent(t, { clientX: x, clientY: y, bubbles: true, button: 0, buttons: t === 'mouseup' ? 0 : 1 }));
  const clear = () => { for (const l of [...S.fire.logs]) S.removeLog(l); step(3); };
  // Agarra una rama del rack, la lleva a (tx,ty), gira `rot` pasos de `dir` grados y la deja agarrada (hold cuadros).
  const put = (tx, ty, rot = 0, dir = 15, hold = 20, key = 'rama') => {
    const l = S.addLog(key, 300, 400, 0); step(3);
    pe('mousedown', l.x, l.y); step(2);
    for (let i = 1; i <= 14; i++) { pe('mousemove', 300 + (tx - 300) * i / 14, 400 + (ty - 400) * i / 14); step(3); }
    for (let i = 0; i < rot; i++) { S.rotateStep(dir); step(3); }
    step(hold);
    return l;
  };
  const up = (x, y) => { pe('mouseup', x, y); step(40); };
  // Copia el canvas a un <img> superpuesto para poder verlo con el panel oculto.
  const shot = () => {
    const url = c.toDataURL('image/png');
    let im = document.getElementById('__shot');
    if (!im) { im = document.createElement('img'); im.id = '__shot'; im.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;'; document.body.appendChild(im); }
    im.src = url;
    return url.length;
  };
  return { G, S, c, step, pe, clear, put, up, shot, pit: S.fire.pits[0] };
})();
