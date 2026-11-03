class_name Noches
# Noches y amanecer: ciclo DÍA 5 min → atardecer 30 s → NOCHE 8 min → amanecer.
# De noche hay que sostener un ritmo mínimo de calor/s; si cae, sube el frío, y si llega a 1 la noche falla.
# Fallar no quita progreso, solo la recompensa.

const DIA := 300.0
const TARDE := 30.0
const NOCHE := 480.0
const PRIMER_DIA_RESTA := 240.0
const FASES := {"day": DIA, "dusk": TARDE, "night": NOCHE}

const META_BASE := 18.0
const META_2 := 26.0
const CRECE := 1.35
const FRIO_TIEMPO := 70.0
const FRIO_RECUPERA := 45.0
const FRIO_RECUPERA_DURA := 60.0
const RAMPA_DEFICIT := 60.0
const RAFAGA_CADA := [80.0, 150.0]
const RAFAGA_DURA := 20.0
const RAFAGA_SUBE := 1.15
const BUENA_NOCHE := 0.6


static func nueva() -> Dictionary:
	return {
		"phase": "off", "t": 0.0, "n": 1, "dawns": 0, "fails": 0, "cold": 0.0, "in_goal": 0.0, "rate_sum": 0.0,
		"start_total": 0.0, "deficit": 0.0, "gust_in": 0.0, "gust": 0.0,
	}


static func meta(n: int, mods: Dictionary, facil_fogon := 1.0) -> float:
	var base := META_BASE if n <= 1 else META_2 * pow(CRECE, n - 2)
	return base * mods.night_ease * facil_fogon


static func ceniza_amanecer(n: int, mods: Dictionary, margen: float) -> int:
	return roundi((2 + n) * (1.0 + 0.5 * clampf(margen, 0.0, 1.5)) * mods.ash_bonus)


static func frio(nt: Dictionary) -> float:
	match nt.phase:
		"dusk": return 0.25 * (nt.t / TARDE)
		"night": return 0.25 + 0.75 * nt.cold
		"day": return 0.25 * maxf(0.0, 1.0 - nt.t / 15.0)
	return 0.0


# Avanza el reloj. Devuelve los eventos: {tipo: dusk | start | gust | dawn, ...}.
static func avanzar(nt: Dictionary, dt: float, ritmo: float, mods: Dictionary, facil_fogon: float) -> Array:
	var eventos := []
	if nt.phase == "off":
		return eventos
	nt.t += dt
	if nt.phase == "day" and nt.t >= DIA:
		nt.phase = "dusk"
		nt.t = 0.0
		eventos.append({"tipo": "dusk"})
	elif nt.phase == "dusk" and nt.t >= TARDE:
		nt.merge({"phase": "night", "t": 0.0, "cold": 0.0, "in_goal": 0.0, "rate_sum": 0.0, "deficit": 0.0, "gust": 0.0, "gust_in": randf_range(RAFAGA_CADA[0], RAFAGA_CADA[1])}, true)
		eventos.append({"tipo": "start"})
	elif nt.phase == "night":
		var dura: bool = nt.n >= 3
		if dura:
			if nt.gust > 0.0:
				nt.gust = maxf(0.0, nt.gust - dt)
				if nt.gust == 0.0:
					nt.gust_in = randf_range(RAFAGA_CADA[0], RAFAGA_CADA[1])
			else:
				nt.gust_in -= dt
				if nt.gust_in <= 0.0:
					nt.gust = RAFAGA_DURA
					eventos.append({"tipo": "gust"})
		var pide: float = meta(int(nt.n), mods, facil_fogon) * (RAFAGA_SUBE if nt.gust > 0.0 else 1.0)
		nt.rate_sum += ritmo * dt
		if ritmo >= pide:
			nt.in_goal += dt
			nt.deficit = 0.0
			var recupera: float = FRIO_RECUPERA_DURA if dura else (52.0 if nt.n == 2 else FRIO_RECUPERA)
			nt.cold = maxf(0.0, nt.cold - dt / recupera)
		else:
			nt.deficit += dt
			var tope := 1.0 if dura else (0.5 if nt.n == 2 else 0.0)
			var rampa := 1.0 + tope * minf(1.0, nt.deficit / RAMPA_DEFICIT)
			nt.cold = minf(1.0, nt.cold + (1.0 - ritmo / pide) * rampa * dt / (FRIO_TIEMPO * mods.cold_slow))
		var fallo: bool = nt.cold >= 1.0
		if fallo or nt.t >= NOCHE:
			var proporcion: float = nt.in_goal / maxf(1.0, nt.t)
			var margen: float = maxf(0.0, (nt.rate_sum / maxf(1.0, nt.t)) / meta(int(nt.n), mods, facil_fogon) - 1.0)
			eventos.append({"tipo": "dawn", "exito": not fallo, "proporcion": proporcion, "margen": margen, "punto": not fallo and proporcion >= BUENA_NOCHE})
			nt.merge({"phase": "day", "t": 0.0, "cold": 0.0}, true)
	return eventos
