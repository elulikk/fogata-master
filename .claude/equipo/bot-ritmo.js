// Bot de ritmo. Juega una partida nueva en tiempo simulado con game.step(), sin guardar.
// Uso: abrir http://127.0.0.1:8080/ (nunca localhost), entrar a una partida NUEVA ("Jugar"), pegar TODO este
// archivo en la consola y llamar, en tandas (cada 300 s simulados tardan menos de un minuto):
//   await botRitmo.run(300);
//   JSON.stringify(botRitmo.report())
// Persona: pone 1 pieza cada `dropEvery` s en un lugar libre, con la mejor madera que tenga; si no tiene de ese
// tamaño, la compra; junta chispazos no; compra las mejoras en el orden del objetivo; elige la primera carta.
// Mide: cuándo llega cada escalón, ritmo cada 60 s, en qué se gastó el calor y cada noche.
(() => {
  const G = window.fogata.game;
  const S = G.scene.getScene('GameScene');
  const state = window.fogata.state;
  state.locked = true;
  S.setMotion(false);
  const SP = ['quebracho', 'roble', 'rauli', 'lenga', 'pino'];
  const log = { hearths: {}, unlocks: {}, buys: [], rate60: [], nights: [], levels: [] };
  const spend = { wood: 0, mejoras: 0 };
  const STEP = 33.33;
  let vt = performance.now();
  let t = 0;
  let nextDrop = 0;
  let nextCheck = 0;
  let nextRate = 60;
  let burnt = 0;
  const bot = { dropEvery: 2.5, log, get t() { return t; } };

  S.events.on('night:dawn', (info) => log.nights.push({ t: Math.round(t), n: info.n, ok: info.success, ash: info.ash, margin: +(info.summary?.margin || 0).toFixed(2) }));

  const step = () => {
    if (S.pendingLevel) { S.pickCard(S.pendingLevel.cards[0].id); log.levels.push({ t: Math.round(t), level: state.data.level }); }
    if (S.paused) {
      document.getElementById('summary-ok')?.click();
      S.setPaused(false);
    }
    vt += STEP;
    G.loop.delta = STEP;
    G.step(vt, STEP);
    t += STEP / 1000;
  };

  const buyWood = (cut) => {
    for (const sp of SP) {
      const it = S.shopItems('pila').find((i) => i.id === `wood_${sp}_${cut}`);
      if (it && it.affordable) {
        S.buy(it.id);
        spend.wood += it.price.calor;
        return true;
      }
    }
    return false;
  };

  let turn = 0;
  const feed = () => {
    turn++;
    const pits = S.pitObjs.map((_, i) => S.pitObjs[(i + turn) % S.pitObjs.length]);
    for (const pit of pits) {
      for (const cut of ['tronco', 'lena', 'rama']) {
        const tier = { rama: 0, lena: 1, tronco: 2 }[cut];
        if (!pit.slotList.some((s) => s.tier === tier && !s.log)) continue;
        let sp = SP.find((x) => state.res[`${x}_${cut}`] > 0);
        // Los troncos solo con fuego fuerte: si no hay llama, primero ramas.
        if (cut !== 'rama' && (pit.heat || 0) < (cut === 'tronco' ? 2 : 0.6)) continue;
        if (!sp) {
          if (!buyWood(cut)) continue;
          sp = SP.find((x) => state.res[`${x}_${cut}`] > 0);
        }
        if (!sp) continue;
        state.add(`${sp}_${cut}`, -1);
        S.addLog(`${sp}_${cut}`, pit);
        return;
      }
    }
  };

  const relight = () => {
    if (S.fire.stats.llama > 0) return;
    const raw = S.fire.logs.find((l) => l.state === 'cruda' && l.wood.cut === 'rama');
    if (!raw) return;
    if (state.res.fosforo > 0) state.res.fosforo--;
    S.fire.strike(raw.x, raw.y, 0.8, 1.8, 40);
  };

  const upgrade = () => {
    const items = [...S.shopItems('tienda'), ...S.shopItems('construir')];
    const all = bot.allItems ? bot.allItems(state.data) : null;
    const rank = (i) => (all?.find((a) => a.id === i.id)?.goal ?? 99);
    const real = items.filter((i) => !i.id.startsWith('pack_') && !['fosforos', 'pinas'].includes(i.id) && !i.maxed && !i.blocked && i.affordable);
    const pick = real.sort((a, b) => rank(a) - rank(b))[0];
    if (!pick) return;
    // Evolucionar deja troncos justos: si faltan, los compra.
    S.buy(pick.id);
    spend.mejoras += pick.price.calor;
    log.buys.push(`${Math.round(t)}: ${pick.id} (${pick.price.calor})`);
  };

  const needTroncos = () => {
    const wanted = S.shopItems('construir').find((i) => i.id === 'agrandar_0' && !i.maxed);
    if (wanted && wanted.need.tronco > 0 && wanted.need.calor === 0) buyWood('tronco');
  };

  const tick = () => {
    if (t >= nextDrop) {
      nextDrop = t + bot.dropEvery;
      feed();
      relight();
    }
    if (t >= nextCheck) {
      nextCheck = t + 2;
      needTroncos();
      upgrade();
      const size = Math.max(...state.data.pits.map((p) => p.size));
      if (!(size in log.hearths)) log.hearths[size] = Math.round(t);
      for (const id of Object.keys(state.data.unlocked)) if (!(id in log.unlocks)) log.unlocks[id] = Math.round(t);
    }
    if (t >= nextRate) { nextRate += 60; log.rate60.push(+S.rate.toFixed(1)); }
  };

  bot.run = async (secs) => {
    const end = t + secs;
    while (t < end) {
      for (let i = 0; i < 60 && t < end; i++) { tick(); step(); }
      await new Promise((r) => setTimeout(r, 0));
    }
    return bot.report();
  };
  bot.report = () => ({
    t: Math.round(t), calor: Math.round(state.data.calor), total: Math.round(state.data.totalCalor), rate: +S.rate.toFixed(1), level: state.data.level,
    pits: state.data.pits.map((p) => p.size), spend: { wood: Math.round(spend.wood), mejoras: Math.round(spend.mejoras) },
    hearths: log.hearths, unlocks: log.unlocks, nights: log.nights, rate60: log.rate60, buys: log.buys,
    stock: Object.fromEntries(Object.entries(state.res).filter(([, n]) => n > 0)),
  });
  import('/js/data/shop.js').then((m) => { bot.allItems = m.allItems; });
  window.botRitmo = bot;
})();
