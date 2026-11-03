class_name Juego
extends RefCounted
# Las reglas de la partida, sin nada de dibujo: se puede correr sola para medir el balance (ver pruebas/bot.gd).
# Todo lo que se ve o suena se entera por `evento`.

signal evento(nombre: String, datos: Dictionary)

var estado := Estado.new()
var clima := Clima.new()
var fuego: Fuego
var pausado := 0 # cuántas ventanas lo tienen en pausa
var _proveedores := {}
var _reloj_mercado := 0.0
var _reloj_mojado := 0.0
var _reloj_revision := 0.0
var _reloj_guardado := 0.0


func _init() -> void:
	_armar_fuego()


func _armar_fuego() -> void:
	fuego = Fuego.new(estado)
	fuego.evento.connect(_de_fuego)
	var pits: Array = estado.d.pits
	for i in pits.size():
		fuego.pozos.append(Pozo.new(i, int(pits[i].size), pits[i].roof))


func cargar_o_empezar() -> void:
	var habia := estado.cargar()
	_armar_fuego()
	evento.emit("mundo_nuevo", {})
	_arranque(not habia)
	if estado.d.unlocked.get("noches", false) and estado.d.night.phase == "off":
		estado.d.night.phase = "day"


func partida_nueva(conservar_meta := false) -> void:
	estado.borrar(conservar_meta)
	clima = Clima.new()
	_armar_fuego()
	evento.emit("mundo_nuevo", {})
	_arranque(true)
	estado.guardar()


# Una rama prendida de regalo para arrancar. La leña en el fuego no se guarda.
func _arranque(nueva: bool) -> void:
	var p: Pozo = fuego.pozos[0]
	for i in 2 if nueva else 1:
		var l := Leno.new("pino_rama", p, estado.mods)
		p.lenos.append(l)
		evento.emit("leno_nuevo", {"leno": l, "suave": true})
		fuego.encender(l, true)


func tick(dt: float) -> void:
	if pausado > 0:
		return
	var d := estado.d
	d.playTime += dt
	clima.tick(dt, d.unlocked, fuego.pozos.size() + d.level / 4.0)
	fuego.tick(dt, clima)
	var total: float = estado.desglose(fuego.pozos, fuego.llamas).total
	estado.ritmo += (total - estado.ritmo) * minf(1.0, dt * 2.0)
	d.meta.stats.maxRate = maxf(d.meta.stats.maxRate, estado.ritmo)
	estado.ganar_calor(total * dt)
	_noche(dt)
	_abastecer(dt)
	_reloj_revision += dt
	if _reloj_revision > 0.4:
		_reloj_revision = 0.0
		_revisar()
	_reloj_guardado += dt
	if _reloj_guardado > 10.0:
		_reloj_guardado = 0.0
		estado.guardar()


func pausar(si: bool) -> void:
	pausado = maxi(0, pausado + (1 if si else -1))
	evento.emit("pausa", {"si": pausado > 0})


# --- Acciones del jugador ---

# Motivo por el que no entra esa leña en ese pozo, o "".
func no_entra(clave: String, p: Pozo) -> String:
	var w := Maderas.de(clave)
	if int(estado.d.res.get(clave, 0)) <= 0:
		return "No te queda: %s" % w.nombre.to_lower()
	var cupo := p.cupo(w.corte, estado.mods)
	if cupo == 0:
		return "%s no acepta %s: evolucionala." % [p.spec().nombre, Maderas.CORTES[w.corte].plural]
	if p.cuantos(w.corte) >= cupo:
		return "No hay lugar para más %s" % Maderas.CORTES[w.corte].plural
	return ""


func soltar(clave: String, p: Pozo, lugar: Vector3) -> bool:
	var motivo := no_entra(clave, p)
	if not motivo.is_empty():
		evento.emit("rechazo", {"texto": motivo})
		return false
	estado.sumar(clave, -1)
	var l := Leno.new(clave, p, estado.mods)
	l.pos = lugar
	p.lenos.append(l)
	evento.emit("leno_nuevo", {"leno": l, "lugar": lugar})
	return true


# Una leña sin prender vuelve a la pila.
func devolver(l: Leno) -> void:
	if l.estado != "cruda":
		return
	estado.sumar(l.clave, 1)
	l.pozo.lenos.erase(l)
	l.estado = "ceniza"
	evento.emit("leno_devuelto", {"leno": l})


func usar_herramienta(id: String, pos: Vector3, p: Pozo) -> void:
	var h := Herramientas.de(id)
	var cerca: Array[Leno] = []
	for l in p.lenos:
		if l.estado == "cruda" and l.pos.distance_to(pos) < h.alcance:
			cerca.append(l)
	if cerca.is_empty():
		return
	if h.has("recurso") and int(estado.d.res.get(h.recurso, 0)) <= 0:
		evento.emit("rechazo", {"texto": "No te quedan: %s" % h.nombre.to_lower()})
		return
	if not cerca.any(func(l: Leno) -> bool: return fuego.puede_prender(l, h.calor, h.dura)):
		evento.emit("rechazo", {"texto": "Muy grueso para esto: prendé algo más chico"})
		return
	if h.has("recurso"):
		estado.sumar(h.recurso, -1)
	var acierta: bool = randf() < h.acierto * (1.0 - p.lluvia * h.lluvia)
	evento.emit("sonido", {"nombre": h.sonido})
	if acierta:
		fuego.golpe(pos, h.calor, h.dura, h.alcance)
		evento.emit("golpe", {"pos": pos})
	elif h.has("recurso") and p.lluvia > 0.0:
		evento.emit("rechazo", {"texto": "La lluvia lo apagó"})
	if h.has("recurso") and int(estado.d.res.get(h.recurso, 0)) == 0:
		estado.d.herramienta = "pedernal"
		evento.emit("aviso", {"texto": "Te quedaste sin fósforos: pasaste al pedernal (cuesta más).", "tipo": "malo"})


func comprar(id: String) -> bool:
	var d := estado.d
	var it := {}
	for x: Dictionary in Tienda.todos(d):
		if x.id == id:
			it = x
	if it.is_empty():
		return false
	var nivel := int(d.bought.get(id, 0))
	if not it.get("mercado", false) and nivel >= it.get("max", 99):
		return false
	var motivo: String = it.get("bloqueado", func(_s: Dictionary) -> String: return "").call(d)
	if not motivo.is_empty():
		evento.emit("aviso", {"texto": motivo, "tipo": "malo"})
		return false
	var p := estado.precio(it, estado.nivel_precio(it))
	if d.calor < p:
		return false
	d.calor -= p
	d.bought[id] = nivel + 1
	if it.get("mercado", false):
		d.demand[id] = int(d.demand.get(id, 0)) + 1
	if it.has("accion"):
		it.accion.call(self)
	estado.recalcular()
	evento.emit("sonido", {"nombre": "compra"})
	estado.guardar()
	return true


func poner_techo(i: int) -> void:
	estado.d.pits[i].roof = true
	fuego.pozos[i].techo = true
	evento.emit("pozo_cambia", {"pozo": fuego.pozos[i]})


func agrandar(i: int) -> void:
	var p: Pozo = fuego.pozos[i]
	estado.d.pits[i].size = p.tam + 1
	p.cambiar_tam(p.tam + 1)
	evento.emit("pozo_cambia", {"pozo": p})
	evento.emit("aviso", {"texto": "🔨 %s. %s" % [p.spec().nombre, p.spec().get("ventaja", {}).get("texto", "")], "tipo": "hito"})
	evento.emit("sonido", {"nombre": "agrandar"})


func nueva_fogata() -> void:
	estado.d.pits.append({"size": 0, "roof": false})
	var p := Pozo.new(fuego.pozos.size(), 0, false)
	fuego.pozos.append(p)
	evento.emit("pozo_nuevo", {"pozo": p})
	evento.emit("aviso", {"texto": "Nueva fogata lista. Cargala de leña y prendela.", "tipo": "hito"})


func renacer() -> bool:
	if not estado.puede_renacer():
		return false
	var ganada := estado.ceniza_posible()
	estado.d.meta.ash += ganada
	estado.d.meta.totalAsh += ganada
	estado.d.meta.prestiges += 1
	partida_nueva(true)
	evento.emit("aviso", {"texto": "Renaciste con +%d de ceniza." % ganada, "tipo": "hito"})
	return true


func dar_botin(botin: Dictionary) -> void:
	for k: String in botin:
		if botin[k] > 0:
			estado.sumar(k, botin[k])
			evento.emit("botin", {"clave": k, "n": botin[k]})


# --- Bucle ---

func _abastecer(dt: float) -> void:
	var d := estado.d
	for s: Dictionary in Proveedores.lista():
		var nivel: int = s.nivel.call(d)
		if nivel == 0 or (s.has("listo") and not s.listo.call(self)):
			continue
		var t: float = _proveedores.get(s.id, 0.0) + dt / s.cada.call(nivel, estado.mods)
		_proveedores[s.id] = 0.0 if t >= 1.0 else t
		if t >= 1.0:
			s.correr.call(self, nivel)
	_reloj_mercado += dt
	if _reloj_mercado >= Tienda.RECUPERA_MERCADO:
		_reloj_mercado = 0.0
		for id: String in d.demand.keys():
			if d.demand[id] > 1:
				d.demand[id] -= 1
			else:
				d.demand.erase(id)
	# La lluvia moja las ramas y la leña de la pila si no hay leñera. Los troncos aguantan.
	if clima.lluvia > 0.2 and d.bought.get("lenera", 0) == 0:
		_reloj_mojado += dt * clima.lluvia
		if _reloj_mojado >= 5.0:
			_reloj_mojado = 0.0
			var secas: Array = Maderas.todas().keys().filter(func(k: String) -> bool:
				var w := Maderas.de(k)
				return d.res.get(k, 0) > 0 and w.especie != "humeda" and not w.cono and w.corte != "tronco")
			if not secas.is_empty():
				var k: String = secas.pick_random()
				estado.sumar(k, -1)
				estado.sumar(Maderas.clave("humeda", Maderas.de(k).corte), 1)
				evento.emit("aviso", {"texto": "Se mojó: %s. Una leñera techada lo evita." % Maderas.de(k).nombre.to_lower(), "tipo": "malo"})


func _revisar() -> void:
	var d := estado.d
	for m: Dictionary in Progreso.HITOS:
		if d.unlocked.get(m.id, false) or d.totalCalor < m.en:
			continue
		d.unlocked[m.id] = true
		if m.id == "noches":
			d.night.phase = "day"
			d.night.t = Noches.DIA - Noches.PRIMER_DIA_RESTA
		evento.emit("aviso", {"texto": m.aviso, "tipo": "hito"})
		evento.emit("sonido", {"nombre": "hito"})
	for a: Dictionary in estado.revisar_logros():
		evento.emit("aviso", {"texto": "%s Logro: %s (%s)" % [a.icono, a.nombre, a.premio], "tipo": "logro"})
		evento.emit("sonido", {"nombre": "logro"})
	while d.totalCalor >= Progreso.umbral_nivel(int(d.level) + 1, estado.mods.level_ease):
		d.level += 1
		var regalo := roundi(estado.ritmo * estado.mods.tribute)
		if regalo > 0:
			estado.ganar_calor(regalo)
		if d.unlocked.get("habilidades", false):
			evento.emit("aviso", {"texto": "¡Nivel %d! Puntos de habilidad: %d." % [d.level, Habilidades.puntos(d)], "tipo": "hito"})
		evento.emit("sonido", {"nombre": "nivel"})
		evento.emit("nivel", {})


func _noche(dt: float) -> void:
	var d := estado.d
	var nt: Dictionary = d.night
	for ev: Dictionary in Noches.avanzar(nt, dt, estado.ritmo, estado.mods, estado.facil_noche()):
		match ev.tipo:
			"dusk":
				evento.emit("aviso", {"texto": "Cae la tarde. La noche %d pide %.1f calor/s: no dejes que se apague." % [nt.n, Noches.meta(int(nt.n), estado.mods, estado.facil_noche())], "tipo": "hito"})
			"start":
				nt.start_total = d.totalCalor
			"gust":
				evento.emit("aviso", {"texto": "Ráfaga helada: la noche pide 15% más.", "tipo": "malo"})
			"dawn":
				_amanecer(ev)


func _amanecer(ev: Dictionary) -> void:
	var d := estado.d
	var nt: Dictionary = d.night
	var ceniza := 0
	if ev.exito:
		ceniza = Noches.ceniza_amanecer(int(nt.n), estado.mods, ev.margen)
		nt.n += 1
		nt.dawns += 1
		d.meta.totalDawns += 1
		d.meta.ash += ceniza
		d.meta.totalAsh += ceniza
		if ev.punto:
			d.puntos_extra += 1
	else:
		nt.fails += 1
	estado.guardar()
	evento.emit("sonido", {"nombre": "amanecer" if ev.exito else "sise"})
	evento.emit("amanecer", {"exito": ev.exito, "ceniza": ceniza, "punto": ev.punto, "proporcion": ev.proporcion, "calor": roundi(d.totalCalor - nt.start_total)})


func _de_fuego(nombre: String, datos: Dictionary) -> void:
	if nombre == "pico":
		var regalo := roundi(estado.ritmo * 20.0)
		estado.ganar_calor(regalo)
		evento.emit("aviso", {"texto": "🔥 ¡Fogata en su punto! +%d" % regalo, "tipo": "hito"})
	evento.emit(nombre, datos)
