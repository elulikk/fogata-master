class_name Estado
extends RefCounted
# Estado de la partida: recursos, calor, desbloqueos, compras y árbol. Se guarda solo.

const ARCHIVO := "user://partida.json"
# Se arranca con ramas y un pedernal: el primer fuego lo prende el jugador (ver datos/tutorial.gd).
const INICIO := {"pino_rama": 6}
const CALOR_POR_INTENSIDAD := 2.0
const CALOR_BASE := 0.6
const TOPE_INCENDIO := 4

var d: Dictionary
var mods: Dictionary
var ritmo := 0.0
var bloqueado := false # con true, guardar no escribe (las pruebas lo usan)


func _init() -> void:
	d = _nueva()
	recalcular()


func _nueva() -> Dictionary:
	return {
		"res": INICIO.duplicate(), "herramienta": "pedernal", "calor": 0.0, "tuto": 0, "soltadas": 0, "totalCalor": 0.0, "level": 1, "puntos_extra": 0,
		"unlocked": {}, "bought": {}, "demand": {}, "arbol": {}, "vistos": {}, "pits": [{"size": 0, "roof": false}], "playTime": 0.0,
		"ajustes": {"volumen": 0.8, "mudo": false}, "meta": Cenizas.nuevo(), "night": Noches.nueva(),
	}


func cargar() -> bool:
	if not FileAccess.file_exists(ARCHIVO):
		return false
	var texto := FileAccess.get_file_as_string(ARCHIVO)
	var leido: Variant = JSON.parse_string(texto)
	if not leido is Dictionary or not leido.has("totalCalor"):
		return false
	d = _nueva()
	d.merge(leido, true)
	if not leido.has("tuto"):
		d.tuto = 99 # partida de antes del tutorial
	recalcular()
	return true


func guardar() -> void:
	if bloqueado:
		return
	var f := FileAccess.open(ARCHIVO, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(d))


# Borra la partida. Los ajustes se conservan; con conservar_meta, también la ceniza y sus mejoras.
func borrar(conservar_meta := false) -> void:
	var viejo := d
	d = _nueva()
	d.ajustes = viejo.ajustes
	if conservar_meta:
		d.meta = viejo.meta
		_bonos_de_inicio()
	recalcular()


func _bonos_de_inicio() -> void:
	var nivel := func(id: String) -> int: return int(d.meta.upgrades.get(id, 0))
	sumar("fosforo", 4 * nivel.call("semilla"))
	sumar("pino_rama", 4 * nivel.call("semilla"))
	d.pits[0].size = mini(3, nivel.call("hogar"))
	for i in nivel.call("atajo"):
		for id: String in Cenizas.ATAJOS[i]:
			d.unlocked[id] = true


func sumar(clave: String, n: int) -> void:
	d.res[clave] = maxi(0, int(d.res.get(clave, 0)) + n)


func ganar_calor(n: float) -> void:
	d.calor += n
	d.totalCalor += n


func madera_total() -> int:
	var n := 0
	for k: String in Maderas.todas():
		n += int(d.res.get(k, 0))
	return n


func precio(it: Dictionary, nivel: float) -> int:
	var base: int = it.costo.call(nivel)
	return ceili(base * mods.discount * (mods.enlarge_cost if it.get("agrandar", false) else 1.0))


func nivel_precio(it: Dictionary) -> float:
	return float(d.demand.get(it.id, 0) if it.get("mercado", false) else d.bought.get(it.id, 0))


# Calor/s de las fogatas, con el desglose para la UI si se pide.
func desglose(pozos: Array[Pozo], ardiendo: int, detalle := false) -> Dictionary:
	var crudo := 0.0
	var tamanos := 0.0
	var lecho := 0.0
	var armada := 0.0
	var tope := minf(0.3, Fogones.ARMADA.tope * mods.structure_bonus)
	for p in pozos:
		var i: float = p.intensidad * CALOR_POR_INTENSIDAD * CALOR_BASE
		var sb := clampf(p.bonus_armada * mods.structure_bonus, 0.0, tope)
		var m := p.mult_calor(mods)
		crudo += i
		tamanos += i * m * (1.0 + sb)
		armada += i * m * sb
		lecho += p.lecho * mods.ash_heat
	var incendio: float = 1.0 + mods.blaze * clampi(ardiendo - 2, 0, TOPE_INCENDIO)
	var total: float = (tamanos + lecho) * mods.calor * mods.cosecha * incendio
	var fuera := {"total": total}
	if detalle:
		fuera["partes"] = [
			["Fuego", "%.1f/s" % crudo], ["Tamaño", "×%.2f" % (((tamanos - armada) / crudo) if crudo > 0.0 else 1.0)],
			["Armada", "+%.1f/s" % armada], ["Lecho", "+%.1f/s" % lecho], ["Mejoras", "×%.2f" % (mods.calor * mods.cosecha * incendio)],
		]
	return fuera


func info_noche() -> Dictionary:
	var nt: Dictionary = d.night
	var pide: float = Noches.meta(int(nt.n), mods, facil_noche()) * (Noches.RAFAGA_SUBE if nt.gust > 0.0 else 1.0)
	var largo: float = Noches.FASES.get(nt.phase, 1.0)
	return {
		"fase": nt.phase, "n": int(nt.n), "resta": maxf(0.0, largo - nt.t), "meta": pide, "avance": 0.0 if nt.phase == "off" else minf(1.0, nt.t / largo),
		"cumple": ritmo >= pide, "frio": Noches.frio(nt), "rafaga": nt.gust > 0.0,
	}


func facil_noche() -> float:
	var f := 1.0
	for p: Dictionary in d.pits:
		f = minf(f, Fogones.ventajas(int(p.size)).night_ease)
	return f


func ceniza_posible() -> int:
	return Cenizas.por_partida(d.totalCalor, mods, int(d.night.dawns))


func puede_renacer() -> bool:
	return d.night.dawns >= 1


func comprar_ceniza(m: Dictionary) -> bool:
	var nivel := int(d.meta.upgrades.get(m.id, 0))
	var costo := Cenizas.costo(m, nivel)
	if nivel >= m.max or d.meta.ash < costo:
		return false
	d.meta.ash -= costo
	d.meta.upgrades[m.id] = nivel + 1
	recalcular()
	return true


func gastar_punto(id: String) -> bool:
	if not Habilidades.se_puede(d, id):
		return false
	d.arbol[id] = int(d.arbol.get(id, 0)) + 1
	recalcular()
	return true


func revisar_logros() -> Array:
	var nuevos := Logros.lista().filter(func(a: Dictionary) -> bool: return not d.meta.achievements.get(a.id, false) and a.cuando.call(d))
	for a: Dictionary in nuevos:
		d.meta.achievements[a.id] = true
	if not nuevos.is_empty():
		recalcular()
	return nuevos


# Próximo paso importante: {icono, texto, avance}, o vacío.
func proximo_objetivo() -> Dictionary:
	if not d.unlocked.get("calor", false):
		return {}
	var hito := _hito("antes")
	if not hito.is_empty():
		return hito
	var items := Tienda.todos(d).filter(func(it: Dictionary) -> bool: return it.has("meta") and int(d.bought.get(it.id, 0)) < it.get("max", 1) and it.requiere.call(d) and it.get("bloqueado", func(_s: Dictionary) -> String: return "").call(d).is_empty())
	items.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.meta < b.meta)
	if not items.is_empty():
		var it: Dictionary = items[0]
		var p := precio(it, nivel_precio(it))
		if d.calor >= p:
			return {"icono": it.icono, "texto": "%s: ya podés comprarlo." % it.nombre, "avance": 1.0}
		return {"icono": it.icono, "texto": "%s: te faltan %d de calor." % [it.nombre, ceili(p - d.calor)], "avance": clampf(d.calor / p, 0.0, 1.0)}
	return _hito("despues")


func _hito(cuando: String) -> Dictionary:
	for m: Dictionary in Progreso.HITOS:
		if m.get("objetivo", "") == cuando and not d.unlocked.get(m.id, false):
			return {"icono": m.icono, "texto": "Juntá %d de calor: %s." % [m.en, m.que], "avance": minf(1.0, d.totalCalor / m.en)}
	return {}


# Todos los efectos del juego, de cualquier origen, se resuelven igual (ver datos/mods.gd).
func recalcular() -> void:
	var m := Mods.vacios()
	for id: String in d.arbol:
		Mods.aplicar(m, Habilidades.NODOS[id].get("efectos", {}), float(d.arbol[id]))
	for u: Dictionary in Cenizas.MEJORAS:
		Mods.aplicar(m, u.get("efectos", {}), float(d.meta.upgrades.get(u.id, 0)))
	for a: Dictionary in Logros.lista():
		if d.meta.achievements.get(a.id, false):
			Mods.aplicar(m, a.efectos, 1.0)
	for it: Dictionary in Tienda.con_efectos():
		Mods.aplicar(m, it.efectos, float(d.bought.get(it.id, 0)))
	mods = m
