// Bot de ritmo (progresión, C5 fase 2). Juega una partida nueva en tiempo simulado con game.step().
// Uso: abrir http://127.0.0.1:8080/ (nunca localhost), entrar a una partida NUEVA ("Jugar"), pegar TODO este
// archivo en la consola (o javascript_tool) y llamar, en tandas porque cada 300 s simulados tardan ~1 min:
//   await botRitmo.run(300);  // repetir hasta llegar a donde interese
//   JSON.stringify(botRitmo.report())
// Opciones: botRitmo.policy = 'cheap' (lo más barato que no sea consumible; el bot del tester) o
// 'goal' (sigue el orden de state.nextGoal: agrandar → hacha → canasta → …).
// Persona (la del tester): suelta 1 leña cada 3 s, va al bosque cuando se queda sin ramas o sin leña buena (seca, o troncos de sobra), elige la primera carta,
// no junta chispazos y quema troncos solo si le sobran más de 8. Sin guardar (state.save anulado).
// Mide: hitos de calor total (500/1.500/2.500/4.500), cada compra con su hora, ritmo cada 60 s y cada noche.
(() => {
  const G = window.fogata.game;
  const S = G.scene.scenes.find((s) => s.fire);
  const state = window.fogata.state;
  state.save = () => false;
  const log = { milestones: {}, buys: [], rate60: [], nights: [], levels: [], goals: [] };
  const MARKS = [500, 1500, 2500, 3000, 4500, 10000];
  const dropEvery = 3;
  let vt = performance.now();
  let t = 0;
  let nextDrop = 0;
  let nextCheck = 0;
  let nextRate = 60;
  const bot = { policy: 'cheap', log, get t() { return t; } };

  S.events.on('night:dawn', (info) => log.nights.push({ t: Math.round(t), n: info.n, ok: info.success, ash: info.ash, margin: +(info.summary?.margin || 0).toFixed(2) }));

  const step = () => {
    if (S.paused && !S.pendingLevel && !document.getElementById('summary')?.classList.contains('hidden')) {
      document.getElementById('summary-ok')?.click();
    }
    if (S.pendingLevel) { S.pickCard(S.pendingLevel.cards[0].id); log.levels.push({ t: Math.round(t), level: state.data.level }); }
    if (S.paused && !S.pendingLevel) S.setPaused(false);
    vt += 16.667;
    G.loop.delta = 16.667;
    G.step(vt, 16.667);
    t += 1 / 60;
  };

  const pickLog = () => {
    const r = state.res;
    if (r.seca > 0) return 'seca';
    if (r.tronco > 8) return 'tronco';
    if (r.rama > 0) return 'rama';
    if (r.humeda > 0) return 'humeda';
    return null;
  };

  const goalOrder = ['agrandar_0', 'hacha', 'canasta', 'fogata_1', 'techo_0', 'lenera', 'botas', 'ayudante', 'secadero', 'agrandar_1', 'techo_1', 'agrandar_2', 'fogata_2'];
  const buyStuff = () => {
    const items = [...S.shopItems('tienda'), ...S.shopItems('construir')].filter((i) => !i.maxed && !i.blocked && i.affordable);
    const real = items.filter((i) => !['fosforos', 'ramas', 'seca', 'troncos', 'pinas'].includes(i.id));
    let pick;
    if (bot.policy === 'goal') {
      pick = real.sort((a, b) => (goalOrder.indexOf(a.id) + 99 * (goalOrder.indexOf(a.id) < 0)) - (goalOrder.indexOf(b.id) + 99 * (goalOrder.indexOf(b.id) < 0)))[0];
    } else {
      pick = real.sort((a, b) => a.price.calor - b.price.calor)[0];
    }
    if (pick) {
      S.buy(pick.id);
      log.buys.push({ t: Math.round(t), id: pick.id, calor: pick.price.calor });
    }
  };

  const tick = () => {
    const pit = S.pitObjs[0];
    if (t >= nextDrop) {
      nextDrop = t + dropEvery;
      const k = pickLog();
      if (k && (pit.loadRatio || 0) < 0.75) {
        state.add(k, -1);
        S.addLog(k, pit.x - 40 + Math.random() * 80, 430 - Math.random() * 40, Math.random() * 0.6);
      }
      // Si no queda llama en ningún pozo y hay fósforos, prende.
      if (!S.fire.logs.some((l) => l.state === 'llama')) {
        const raw = S.fire.logs.find((l) => l.state === 'cruda');
        if (raw && state.res.fosforo > 0) { state.res.fosforo--; S.fire.strike(raw.x, raw.y, 0.8, 1.8); }
      }
    }
    if (t >= nextCheck) {
      nextCheck = t + 2;
      const good = state.res.seca + Math.max(0, state.res.tronco - 8);
      if ((state.res.rama <= 1 || good === 0) && !S.trip && state.unlocked.bosque) S.startTrip();
      buyStuff();
      const g = state.nextGoal({ rain: 0 });
      if (g && g.text !== bot._lastGoal) { bot._lastGoal = g.text; log.goals.push(Math.round(t) + ': ' + g.text); }
      for (const m of MARKS) if (!(m in log.milestones) && state.data.totalCalor >= m) log.milestones[m] = Math.round(t);
    }
    if (t >= nextRate) { nextRate += 60; log.rate60.push(+S.rate.toFixed(1)); }
  };

  bot.run = async (secs) => {
    const end = t + secs;
    while (t < end) {
      for (let i = 0; i < 120 && t < end; i++) { tick(); step(); }
      await new Promise((r) => setTimeout(r, 0));
    }
    return bot.report();
  };
  bot.report = () => ({
    t: Math.round(t), calor: Math.round(state.data.totalCalor), rate: +S.rate.toFixed(1), level: state.data.level,
    pits: state.data.pits.map((p) => p.size), res: { ...state.res }, night: { n: state.data.night.n, phase: state.data.night.phase },
    milestones: log.milestones, goals: log.goals, buys: log.buys, rate60: log.rate60, nights: log.nights,
  });
  window.botRitmo = bot;
})();
