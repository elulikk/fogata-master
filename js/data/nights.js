// Noches y amanecer: meta de mediano plazo que se abre con el hito 'noches'.
// Ciclo: DÍA 5 min → atardecer 30 s → NOCHE 8 min → amanecer.
// Durante la noche hay que sostener un ritmo mínimo de calor/s (la meta); si el
// ritmo cae, el frío sube, y si llega a 1 la noche falla. Fallar no quita
// progreso, solo la recompensa.

export const DAY = 300;
export const DUSK = 30;
export const NIGHT = 480;
// Al desbloquear las noches, segundos de día que quedan hasta la primera tarde.
export const FIRST_DAY_LEFT = 240;
export const NIGHT_PHASES = { day: DAY, dusk: DUSK, night: NIGHT };

const BASE_GOAL = 4.2;     // calor/s de la primera noche (≈ 2 leños de seca+tronco en un pozo agrandado)
const GOAL_2 = 4.4;        // noche 2: una puerta, alcanzable con 1 pozo bien atendido
const GOAL_GROWTH = 1.3;   // noches 3+: 30% más cada una
const COLD_TIME = 70;      // s para congelarse con ritmo cero
const COLD_RECOVER = 45;   // s para entrar en calor con la meta cumplida (noche 1)
const COLD_RECOVER_HARD = 60; // noches 3+: se entra en calor más despacio (la 2 usa 52)
const DEFICIT_RAMP = 60;   // tras 60 s seguidos bajo la meta el frío sube más rápido (×2 desde la noche 3, ×1,5 en la 2)
const GUST_EVERY = [80, 150]; // noches 3+: ráfaga helada cada tanto
const GUST_LEN = 20;       // s que dura la ráfaga
const GUST_BOOST = 1.15;   // durante la ráfaga la meta pide 15% más
const GOOD_RATIO = 0.6;    // fracción de la noche en meta para ganar carta gratis

export function freshNight() {
  return {
    phase: 'off',   // 'off' (sin desbloquear) | 'day' | 'dusk' | 'night'
    t: 0,           // segundos dentro de la fase
    n: 1,           // noche que se está jugando / se viene
    dawns: 0,       // amaneceres logrados en esta partida
    fails: 0,
    coldLvl: 0,     // 0..1: llegar a 1 es perder la noche
    inGoal: 0,      // segundos de esta noche con la meta cumplida
    rateSum: 0,     // calor/s acumulado durante la noche (para el margen sobre la meta)
    startTotal: 0,  // calor total al empezar la noche
    freeCard: false, // carta gratis pendiente por mostrar
    deficitT: 0,    // segundos seguidos bajo la meta (acelera el frío)
    gustIn: 0,      // segundos hasta la próxima ráfaga helada
    gustT: 0,       // segundos que le quedan a la ráfaga actual
  };
}

// Meta de calor/s de la noche n. `mods.nightEase` la baja (Vigilia, mejoras).
// La noche 1 es el tutorial (2,5) y la 2 una puerta (2,3). Luego: 3,0 / 3,9 / 5,1 / 6,6…
export function nightGoal(n, mods) {
  const base = n <= 1 ? BASE_GOAL : GOAL_2 * Math.pow(GOAL_GROWTH, n - 2);
  return base * (mods?.nightEase ?? 1);
}

// Meta en este instante: incluye la ráfaga helada si está activa.
export function nightGoalNow(night, mods) {
  return nightGoal(night.n, mods) * (night.gustT > 0 ? GUST_BOOST : 1);
}

// Ceniza que da amanecer en la noche n. `margin` (0..) es cuánto pasó el ritmo medio la meta:
// con 100% de margen la ceniza sube 50%.
export function dawnAsh(n, mods, margin = 0) {
  const bonus = 1 + 0.5 * Math.min(1.5, Math.max(0, margin || 0));
  return Math.round((2 + n) * bonus * (mods?.ashBonus ?? 1));
}

// Cuánto frío se ve (0..1): sirve para tintar la escena.
export function coldOf(night) {
  switch (night.phase) {
    case 'dusk': return 0.25 * (night.t / DUSK);
    case 'night': return 0.25 + 0.75 * night.coldLvl;
    case 'day': return 0.25 * Math.max(0, 1 - night.t / 15); // se entibia al amanecer
    default: return 0;
  }
}

// Avanza el reloj de la noche. Devuelve los eventos ocurridos:
// { type: 'dusk' } | { type: 'start' } | { type: 'gust', dur } | { type: 'dawn', success, ratio, margin }
// (un fallo es { type: 'dawn', success: false, failed: true }).
export function stepNight(night, dt, rate, mods) {
  const events = [];
  if (night.phase === 'off') return events;
  night.t += dt;

  if (night.phase === 'day' && night.t >= DAY) {
    night.phase = 'dusk';
    night.t = 0;
    events.push({ type: 'dusk' });
  } else if (night.phase === 'dusk' && night.t >= DUSK) {
    night.phase = 'night';
    night.t = 0;
    night.coldLvl = 0;
    night.inGoal = 0;
    night.rateSum = 0;
    night.deficitT = 0;
    night.gustT = 0;
    night.gustIn = GUST_EVERY[0] + Math.random() * (GUST_EVERY[1] - GUST_EVERY[0]);
    events.push({ type: 'start' });
  } else if (night.phase === 'night') {
    const hard = night.n >= 3;
    if (hard) {
      if (night.gustT > 0) {
        night.gustT -= dt;
        if (night.gustT <= 0) {
          night.gustT = 0;
          night.gustIn = GUST_EVERY[0] + Math.random() * (GUST_EVERY[1] - GUST_EVERY[0]);
        }
      } else {
        night.gustIn -= dt;
        if (night.gustIn <= 0) {
          night.gustT = GUST_LEN;
          events.push({ type: 'gust', dur: GUST_LEN });
        }
      }
    }
    const goal = nightGoalNow(night, mods);
    night.rateSum = (night.rateSum || 0) + rate * dt;
    if (rate >= goal) {
      night.inGoal += dt;
      night.deficitT = 0;
      night.coldLvl = Math.max(0, night.coldLvl - dt / (hard ? COLD_RECOVER_HARD : night.n === 2 ? 52 : COLD_RECOVER));
    } else {
      const deficit = 1 - rate / goal;
      night.deficitT += dt;
      const maxRamp = hard ? 1 : night.n === 2 ? 0.5 : 0;
      const ramp = 1 + maxRamp * Math.min(1, night.deficitT / DEFICIT_RAMP);
      night.coldLvl = Math.min(1, night.coldLvl + (deficit * ramp * dt) / (COLD_TIME * (mods?.coldSlow ?? 1)));
    }
    const failed = night.coldLvl >= 1;
    if (failed || night.t >= NIGHT) {
      const ratio = night.inGoal / Math.max(1, night.t);
      const margin = Math.max(0, (night.rateSum / Math.max(1, night.t)) / nightGoal(night.n, mods) - 1);
      events.push({ type: 'dawn', success: !failed, failed, ratio, margin, cardFree: !failed && ratio >= GOOD_RATIO });
      night.phase = 'day';
      night.t = 0;
      night.coldLvl = 0;
    }
  }
  return events;
}
