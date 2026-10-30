// Medición compartida de calor: pila suelta vs tipi vs cabaña, con la misma API.
// Uso: pegar TODO en la consola (o javascript_tool) con el juego abierto en http://127.0.0.1:8080/ ;
// devuelve una promesa: `JSON.stringify(await medir({ size: 3, runs: 3, rain: 0 }))`.
//  - Estructuras: ranuras reales (arrastres con MouseEvent sobre el canvas; la rotación con rotateStep).
//  - Pila: addLog y soltado desde arriba en x al azar dentro del pozo.
//  - Prende UN leño con el mismo camino que el fósforo (fire.strike(x, y, 0.8, 1.8) sobre el 1.º leño).
//  - Avanza con game.step hasta que no queda leña. Integra lo que cobra el jugador:
//      rate  = ∫ state.rate dt   (calor/s mostrado)
//      calor = Δ state.data.calor (lo que de verdad suma)
//      heat  = ∫ Σ heatOut dt    (emisión física de las leñas)
//    más pico de state.rate, duración (s) y heatOut medio por leño encendido.
// ttl = duración (s) de la fuente de calor (1.8 = fósforo; 4+ = una llama sostenida, útil con lluvia en pozos grandes).
// Pozo: se fuerza el tamaño pedido y se restablece al terminar. No guarda la partida (state.save anulado).
// El panel oculto no repinta; se llama a setPaused(false) en cada paso por si se abre un modal.
async function medir({ size = 3, runs = 3, rain = 0, kinds = ["pile4", "tipi", "pile5", "cabin"], ttl = 1.8 } = {}) {
  const G = window.fogata.game;
  const S = G.scene.scenes.find((s) => s.fire);
  const c = G.canvas;
  const W = 1280;
  const H = 720;
  c.getBoundingClientRect = () => ({ left: 0, top: 0, right: W, bottom: H, width: W, height: H, x: 0, y: 0 });
  G.scale.refresh();
  window.fogata.state.save = () => false;
  const pit = S.fire.pits[0];
  const size0 = pit.size;
  let vt = performance.now();
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      if (S.paused || S.matter.world.enabled === false) S.setPaused(false);
      vt += 16.667;
      G.loop.delta = 16.667;
      G.step(vt, 16.667);
    }
  };
  const pe = (t, x, y) => c.dispatchEvent(new MouseEvent(t, { clientX: x, clientY: y, bubbles: true, button: 0, buttons: t === 'mouseup' ? 0 : 1 }));
  const clear = () => { for (const l of [...S.fire.logs]) S.removeLog(l); step(3); };
  const put = (tx, ty, rot = 0, dir = 15) => {
    const l = S.addLog('rama', 300, 400, 0);
    step(3);
    pe('mousedown', l.x, l.y); step(2);
    for (let i = 1; i <= 14; i++) { pe('mousemove', 300 + (tx - 300) * i / 14, 400 + (ty - 400) * i / 14); step(3); }
    for (let i = 0; i < rot; i++) { S.rotateStep(dir); step(3); }
    step(20); pe('mouseup', tx, ty); step(40);
    return l;
  };
  const builders = {
    pile4: () => pile(4),
    pile5: () => pile(5),
    tipi: () => [15, -15, 15, -15].map((dir) => put(pit.x, 540, 4, dir)),
    cabin: () => [[-60, 560], [60, 560], [-60, 520], [60, 520], [0, 500]].map(([dx, ty]) => put(pit.x + dx, ty)),
  };
  function pile(n) {
    const r = [];
    for (let i = 0; i < n; i++) r.push(S.addLog('rama', pit.x - 30 + Math.random() * 60, 480 - i * 30, Math.random() * 0.6));
    step(240);
    return r;
  }
  S.weather.update = () => {};
  S.weather.rain = rain;
  S.weather.wind = 0;
  pit.setSize(size); step(5);
  const out = {};
  for (const kind of kinds) {
    out[kind] = [];
    for (let run = 0; run < runs; run++) {
      clear(); pit.bed = 0;
      // Una estructura solo vale si TODAS las leñas quedaron encajadas (si no, se rearma, hasta 4 veces).
      let logs = builders[kind]();
      for (let k = 0; k < 4 && (kind === 'tipi' || kind === 'cabin') && !logs.every((l) => l.slot); k++) { clear(); pit.bed = 0; logs = builders[kind](); }
      const n = logs.length;
      const encajadas = logs.filter((l) => l.slot).length;
      const first = logs[0];
      const calor0 = S.state.data.calor;
      S.fire.strike(first.x, first.y, 0.8, ttl);
      let rate = 0, heat = 0, peak = 0, t = 0, eSum = 0, eN = 0, steps = 0;
      const st = `${pit.structure.type}${pit.structure.quality.toFixed(2)}`;
      for (; steps < 6000 && S.fire.logs.length; steps++) {
        step(1);
        rate += (S.rate || 0) / 60;
        peak = Math.max(peak, S.rate || 0);
        let h = 0, b = 0;
        for (const l of S.fire.logs) if (l.heatOut > 0) { h += l.heatOut; b++; }
        heat += h / 60;
        if (b) { eSum += h / b; eN++; }
      }
      out[kind].push({ n, encajadas, struct: st, rate: +rate.toFixed(1), calor: +(S.state.data.calor - calor0).toFixed(1), heat: +heat.toFixed(1), pico: +peak.toFixed(2), dur: +(steps / 60).toFixed(1), heatOutPorLeno: +(eSum / Math.max(1, eN)).toFixed(2) });
    }
  }
  clear();
  pit.setSize(size0); step(5);
  return out;
}
