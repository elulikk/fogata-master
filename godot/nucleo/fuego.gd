class_name Fuego
extends RefCounted
# La simulación del fuego, sin nada de dibujo: cada leña recibe el calor de todo su pozo, se calienta,
# se seca si está húmeda, prende, arde, queda en brasas y termina en ceniza. Avisa lo que pasa por `evento`.

signal evento(nombre: String, datos: Dictionary)

const REPARTE_CALOR := 1.6
const ACHICA_A := 0.5
# Fracción de combustible con la que la llama pasa a brasas.
const BRASAS_DESDE := 0.2
# Ceniza que deja cada pieza (se diluye en pozos grandes), lo que se asienta sola por segundo y lo que lava la lluvia.
const CENIZA_POR_PIEZA := 0.025
const CENIZA_ASIENTA := 0.004
const CENIZA_LAVA := 0.02
const PICO := {"umbral": 1.0, "dura": 5.0, "espera": 120.0}

var estado: Estado
var pozos: Array[Pozo] = []
var fuentes: Array[Dictionary] = []
var llamas := 0
var brasas := 0
var siseo := 0.0
var intensidad := 0.0
var pico_espera := 60.0
var progreso_pico := 0.0


func _init(e: Estado) -> void:
	estado = e


func apagado() -> bool:
	return fuentes.is_empty() and not pozos.any(func(p: Pozo) -> bool: return p.prendido())


func golpe(pos: Vector3, calor: float, dura: float, alcance: float) -> void:
	fuentes.append({"pos": pos, "calor": calor, "dura": dura, "alcance": alcance})


# ¿Alcanza ese calor para prender esta leña? La húmeda se deja probar: primero se seca.
func puede_prender(l: Leno, calor: float, dura: float) -> bool:
	if l.humedad > 0.0:
		return true
	var m := estado.mods
	var tibia: float = l.madera.tibia * m.warm * (1.0 + 0.05 * l.pozo.tam) / l.pozo.s_prende
	return l.temp + (calor - l.temp) * (1.0 - exp(-dura / tibia)) >= l.madera.prende * m.ignite


func soplar(p: Pozo) -> void:
	p.fuelle = minf(1.3, p.fuelle + 0.55 * estado.mods.bellows)
	evento.emit("soplo", {"pozo": p})


func encender(l: Leno, suave := false) -> void:
	l.estado = "llama"
	l.temp = 1.0
	l.llama = 0.3 if suave else 0.15
	l.tiempo_bajo = 0.0
	l.tiempo_rebrote = 0.0
	l.ahogada = false
	l.pozo.destello = maxf(l.pozo.destello, 0.35 if suave else 0.7)
	evento.emit("encendida", {"leno": l, "suave": suave})


func tick(dt: float, clima: Clima) -> void:
	var m := estado.mods
	var viento: float = clima.viento
	var lluvia_todo: float = clima.lluvia * (1.0 - minf(0.8, m.rain_resist))

	for p in pozos:
		p.carga = 0.0
		p.ardiendo = 0
		for l in p.lenos:
			p.carga += l.area()
			if l.ardiendo():
				p.ardiendo += 1
		p.relacion_carga = p.carga / p.capacidad(m)
		p.destello = maxf(0.0, p.destello - dt * 2.2)
		p.fuelle = maxf(maxf(0.0, p.fuelle - dt * 0.7), p.ventajas.bellows)
		_estructura(p, dt)
		p.aire = minf(1.5, (1.0 + p.fuelle * 0.6 + viento * 0.3) * p.spec().aire * p.s_aire * m.draft * (1.0 - p.ahogo()))
		p.lluvia = 0.0 if p.techo or p.ventajas.cubierto else lluvia_todo * (1.0 + 0.1 * p.tam)
		if p.armada:
			p.lluvia *= 1.0 - 0.35 * p.calidad

	for i in range(fuentes.size() - 1, -1, -1):
		fuentes[i].dura -= dt
		if fuentes[i].dura <= 0.0:
			fuentes.remove_at(i)

	llamas = 0
	brasas = 0
	siseo = 0.0
	for p in pozos:
		var total_calor := 0.0
		for l in p.lenos:
			total_calor += l.calor_sale
		for l in p.lenos.duplicate():
			var entra: float = (total_calor - l.calor_sale) * REPARTE_CALOR + p.lecho * (0.55 + 0.6 * p.fuelle) * (1.0 + 0.15 * p.tam)
			for f: Dictionary in fuentes:
				var dist := maxf(0.0, f.pos.distance_to(l.pos) - l.madera.radio)
				entra += f.calor * exp(-(dist * dist) / (f.alcance * f.alcance))
			entra = entra * (1.0 + 0.3 * p.fuelle) - p.lluvia * 0.4
			l.aire = p.aire
			l.lluvia = p.lluvia
			_actualizar(l, maxf(0.0, entra), dt, viento)

	var suma := 0.0
	for p in pozos:
		p.lecho = maxf(0.0, p.lecho - dt * (0.012 * m.bed_decay * p.ventajas.bed_decay * (1.0 - p.abrigo()) + p.lluvia * 0.08))
		p.ceniza = maxf(0.0, p.ceniza - dt * (CENIZA_ASIENTA + p.lluvia * CENIZA_LAVA))
		var calor_pozo: float = p.lecho * 0.5 * (1.0 + p.fuelle)
		for l in p.lenos:
			calor_pozo += l.calor_sale
		var objetivo := clampf(calor_pozo / 3.5, 0.0, 5.0 * p.spec().tipis * p.holgura(m))
		p.intensidad += (objetivo - p.intensidad) * minf(1.0, dt * 2.5)
		suma += p.intensidad
	intensidad = suma
	_pico(dt)


func _estructura(p: Pozo, dt: float) -> void:
	var m := estado.mods
	var cortes := 0
	var total := 0
	var usados := p.lenos.size()
	for corte: String in Maderas.ORDEN_CORTES:
		total += p.cupo(corte, m)
		if p.cuantos(corte) > 0:
			cortes += 1
	var objetivo := 0.65 + 0.35 * usados / maxf(1.0, total) if cortes == Maderas.ORDEN_CORTES.size() else 0.0
	p.calidad = objetivo if objetivo > p.calidad else p.calidad + (objetivo - p.calidad) * minf(1.0, dt * 1.5)
	if p.calidad >= 0.9 and not p.armada_anotada:
		p.armada_anotada = true
		estado.d.meta.stats.armada += 1
	elif p.calidad < 0.8:
		p.armada_anotada = false
	if not p.armada and p.calidad >= 0.6:
		p.armada = true
		evento.emit("armada", {"pozo": p})
	elif p.armada and p.calidad < 0.4:
		p.armada = false
	var a: Dictionary = Fogones.ARMADA
	var q := p.calidad if p.armada else 0.0
	p.s_aire = 1.0 + a.air * q
	p.s_prende = 1.0 + a.ignite * q
	p.s_quema = 1.0 + a.fuel * q
	p.bonus_armada = minf(a.tope, a.calor * q)


func _actualizar(l: Leno, entra: float, dt: float, viento: float) -> void:
	var m := estado.mods
	var w := l.madera
	var p := l.pozo
	if l.estado == "cruda":
		var tibia: float = w.tibia * m.warm * (1.0 + 0.05 * p.tam) * p.ventajas.ignite / p.s_prende
		l.temp += (entra - l.temp) * minf(1.0, dt / tibia if entra > l.temp else dt / (tibia * 4.0))
		# La lluvia moja la leña a la intemperie; si el fuego la calienta, se seca más rápido de lo que se moja.
		if l.lluvia > 0.05 and entra < 0.3 and not w.cono:
			l.humedad = minf(1.0, l.humedad + l.lluvia * 0.025 * dt)
		if l.humedad > 0.0:
			if l.temp > 0.3:
				if l.secando == 0.0:
					evento.emit("seca", {"leno": l})
				l.humedad = maxf(0.0, l.humedad - (minf(entra, 1.6) - 0.25) * dt * m.dry / w.secado)
				l.temp = minf(l.temp, 0.36)
				l.secando = clampf((entra - 0.3) / 0.8, 0.15, 1.0)
				siseo += l.secando * 0.6
			else:
				l.secando = 0.0
		else:
			l.secando = 0.0
			if l.temp >= w.prende * m.ignite:
				encender(l)
		l.calor_sale = 0.0
		l.llama = maxf(0.0, l.llama - dt * 2.0)
	elif l.estado == "llama":
		var objetivo := (minf(1.3, (0.55 + entra * 0.45) * l.aire) - l.lluvia * 0.35) * (1.0 + 0.25 * p.fuelle)
		l.llama = maxf(0.0, l.llama + (objetivo - l.llama) * minf(1.0, dt * 1.6))
		l.combustible -= dt * (0.45 + l.llama * 0.75) * (1.0 + viento * 0.4) * p.s_quema * p.spec().quema
		l.calor_sale = w.calor * l.llama
		l.tiempo_bajo = l.tiempo_bajo + dt if l.llama < 0.22 else 0.0
		llamas += 1
		if randf() < w.chasquido * l.llama * dt:
			evento.emit("chasquido", {"leno": l, "fuerza": 0.4 + 0.6 * minf(1.0, l.llama)})
		if l.tiempo_bajo > 2.2:
			_a_brasas(l, true)
		elif l.combustible <= l.combustible_max * BRASAS_DESDE:
			_a_brasas(l, false)
	elif l.estado == "brasas":
		var base := 1.0 if l.ahogada else 0.35 + 0.65 * clampf(l.combustible / (l.combustible_max * BRASAS_DESDE), 0.0, 1.0)
		l.brasa = base * clampf(l.aire, 0.3, 1.3) * (1.0 - l.lluvia * 0.4)
		l.combustible -= dt * (0.12 if l.ahogada else 0.3) * (1.0 + p.fuelle * 1.5 + l.lluvia * 2.0 + viento * 0.5) / m.embers * p.s_quema * p.spec().quema
		l.calor_sale = w.calor * 0.5 * l.brasa
		l.llama = maxf(0.0, l.llama - dt * 1.5)
		brasas += 1
		if l.ahogada and l.aire > 0.8 and l.lluvia < 0.5:
			l.tiempo_rebrote += dt
			if l.tiempo_rebrote > 0.8:
				encender(l, true)
		else:
			l.tiempo_rebrote = 0.0
		if l.ahogada and l.combustible <= l.combustible_max * BRASAS_DESDE:
			l.ahogada = false
		if l.combustible <= 0.0:
			_a_ceniza(l)
			return
	if l.ardiendo():
		_achicar(l)


func _a_brasas(l: Leno, ahogada: bool) -> void:
	l.estado = "brasas"
	l.ahogada = ahogada
	if ahogada:
		evento.emit("ahogada", {"leno": l})


func _a_ceniza(l: Leno) -> void:
	var p := l.pozo
	l.estado = "ceniza"
	p.ceniza = minf(Pozo.CENIZA_MAXIMA, p.ceniza + CENIZA_POR_PIEZA / (1.0 + 0.3 * p.tam))
	p.lecho = minf(1.0, p.lecho + 0.18 * l.madera.calor)
	p.lenos.erase(l)
	evento.emit("ceniza", {"leno": l})


# A la mitad del combustible la pieza pasa al corte de abajo, si ahí hay lugar: libera su cupo para leña nueva.
func _achicar(l: Leno) -> void:
	var sigue: String = l.madera.sigue
	if sigue.is_empty() or l.combustible > l.combustible_max * ACHICA_A:
		return
	var corte: String = Maderas.de(sigue).corte
	if l.pozo.cuantos(corte) >= l.pozo.cupo(corte, estado.mods):
		return
	l.cambiar_madera(sigue)
	l.pozo.destello = maxf(l.pozo.destello, 0.2)
	evento.emit("achica", {"leno": l})


func _pico(dt: float) -> void:
	pico_espera = maxf(0.0, pico_espera - dt)
	progreso_pico = 0.0
	if pico_espera > 0.0:
		for p in pozos:
			p.pico_t = 0.0
		return
	var logrado: Pozo = null
	for p in pozos:
		p.pico_t = p.pico_t + dt if p.intensidad >= PICO.umbral else maxf(0.0, p.pico_t - dt * 0.6)
		var avance := clampf(p.pico_t / PICO.dura, 0.0, 1.0)
		progreso_pico = maxf(progreso_pico, avance)
		if avance >= 1.0 and logrado == null:
			logrado = p
	if logrado:
		for p in pozos:
			p.pico_t = 0.0
		pico_espera = PICO.espera
		progreso_pico = 0.0
		evento.emit("pico", {"pozo": logrado})
