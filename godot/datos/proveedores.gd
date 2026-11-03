class_name Proveedores
# De dónde sale la leña que no comprás. Para sumar un proveedor alcanza con una entrada:
# nivel(d): 0 = inactivo. cada(nivel, mods): segundos entre entregas. listo(j): si es false, el contador espera. correr(j, nivel): qué hace.

# Hasta cuántas piezas de cada corte dejan los proveedores en la pila. Comprando no hay tope.
const TOPE_PILA := {"rama": 6, "lena": 6, "tronco": 3}
# Ramas del suelo: red para no quedar trabado sin leña ni calor.
const RAMAS_DEL_SUELO_BAJO := 3

static var _lista: Array = []


static func _ramas(res: Dictionary) -> int:
	var n := 0
	for k: String in Maderas.todas():
		if Maderas.de(k).corte == "rama":
			n += int(res.get(k, 0))
	return n


# Entrega de leña: trae solo los cortes que tus fogatas aceptan.
static func entrega(j, escala: float) -> Dictionary:
	var d: Dictionary = j.estado.d
	var m: float = j.estado.mods.loot * escala
	var fogon := Tienda.mejor_fogon(d)
	var botin := {}
	var sumar := func(corte: String, n: float) -> void:
		if not Tienda.corte_abierto(d, corte):
			return
		for i in roundi(n):
			var k := Maderas.clave(Maderas.sortear_especie(fogon), corte)
			botin[k] = botin.get(k, 0) + 1
	sumar.call("rama", randf_range(1.0, 3.0) * m)
	if randf() < 0.7:
		sumar.call("lena", randf_range(1.0, 2.0) * m)
	if d.bought.get("hacha", 0) > 0:
		sumar.call("tronco", randf_range(0.5, 1.5) * m)
	if d.totalCalor >= 1000 and d.res.get("pina", 0) < 8 and randf() < 0.3:
		botin["pina"] = roundi(randf_range(1.0, 3.0) * m * j.estado.mods.pinas)
	if d.res.get("fosforo", 0) < 3 and randf() < 0.25:
		botin["fosforo"] = 1
	# Lo que ya sobra en la pila no se trae. La húmeda no ocupa lugar: si no, frena las entregas.
	for corte: String in Maderas.ORDEN_CORTES:
		var hay := 0
		for k: String in Maderas.todas():
			var w: Dictionary = Maderas.de(k)
			if w.corte == corte and w.especie != "humeda":
				hay += int(d.res.get(k, 0))
		var lugar := maxi(0, roundi(TOPE_PILA[corte] * j.estado.mods.pile_cap) - hay)
		for k: String in botin:
			if not Maderas.es_madera(k) or Maderas.de(k).corte != corte or Maderas.de(k).cono:
				continue
			var toma: int = mini(lugar, botin[k])
			lugar -= toma
			botin[k] = toma
	# Con lluvia, parte de las ramas y la leña viene mojada.
	var lluvia: float = j.clima.lluvia
	if lluvia > 0.1:
		for k: String in botin.keys():
			if not Maderas.es_madera(k):
				continue
			var w: Dictionary = Maderas.de(k)
			if w.cono or w.especie == "humeda" or w.corte == "tronco":
				continue
			var mojadas := roundi(botin[k] * lluvia * 0.5)
			if mojadas > 0:
				botin[k] -= mojadas
				var h := Maderas.clave("humeda", w.corte)
				botin[h] = botin.get(h, 0) + maxi(1, roundi(mojadas / 2.0))
	return botin


# La pieza más abundante de ese corte en la pila (sin piñas ni húmeda), o "".
static func _mas_abundante(res: Dictionary, corte: String) -> String:
	var mejor := ""
	var hay := 0
	for k: String in Maderas.todas():
		var w: Dictionary = Maderas.de(k)
		if w.corte == corte and not w.cono and w.especie != "humeda" and int(res.get(k, 0)) > hay:
			hay = int(res[k])
			mejor = k
	return mejor


# Qué cargaría el cuidador ahora: la fogata prendida con más lugar libre de un corte que tengas en la pila.
static func siguiente_carga(j) -> Dictionary:
	var mejor := {}
	var libre_mejor := 0.0
	for p: Pozo in j.fuego.pozos:
		if not p.prendido():
			continue
		var cortes: Array = Maderas.ORDEN_CORTES.duplicate()
		cortes.reverse() # a igual lugar libre, primero lo más grueso
		for corte: String in cortes:
			var cupo: int = p.cupo(corte, j.estado.mods)
			var libre: float = (cupo - p.cuantos(corte)) / maxf(1.0, cupo)
			var clave := _mas_abundante(j.estado.d.res, corte)
			if cupo > 0 and libre > libre_mejor and not clave.is_empty():
				libre_mejor = libre
				mejor = {"clave": clave, "pozo": p}
	return mejor


static func lista() -> Array:
	if not _lista.is_empty():
		return _lista
	_lista = [
		{
			"id": "suelo",
			"nivel": func(_d: Dictionary) -> int: return 1,
			"cada": func(_n: int, _m: Dictionary) -> float: return 8.0,
			"listo": func(j) -> bool: return _ramas(j.estado.d.res) < RAMAS_DEL_SUELO_BAJO,
			"correr": func(j, _n: int) -> void: j.dar_botin({"pino_rama": 1}),
		},
		{
			"id": "lenador", "etiqueta": "🪓 Leñador",
			"nivel": func(d: Dictionary) -> int: return int(d.bought.get("ayudante", 0)),
			"cada": func(n: int, m: Dictionary) -> float: return 30.0 / (1.0 + 0.25 * (n - 1)) * m.helper_every,
			"correr": func(j, _n: int) -> void: j.dar_botin(entrega(j, 0.6)),
		},
		{
			"id": "sabueso", "etiqueta": "🐕 Sabueso",
			"nivel": func(d: Dictionary) -> int: return int(d.arbol.get("sabueso", 0)),
			"cada": func(n: int, m: Dictionary) -> float: return 60.0 / (1.0 + 0.5 * (n - 1)) * m.helper_every,
			"correr": func(j, _n: int) -> void: j.dar_botin(entrega(j, 0.4)),
		},
		{
			"id": "cuidador", "etiqueta": "🧤 Cuidador",
			"nivel": func(d: Dictionary) -> int: return int(d.bought.get("cuidador", 0)),
			"cada": func(n: int, _m: Dictionary) -> float: return 14.0 / (1.0 + 0.6 * (n - 1)),
			"listo": func(j) -> bool: return not siguiente_carga(j).is_empty(),
			"correr": func(j, _n: int) -> void:
				var c := siguiente_carga(j)
				if not c.is_empty():
					var p: Pozo = c.pozo
					j.soltar(c.clave, p, p.centro + Vector3(randf_range(-0.2, 0.2), 0.0, randf_range(-0.2, 0.2))),
		},
		{
			"id": "secadero", "etiqueta": "🧱 Secadero",
			"nivel": func(d: Dictionary) -> int: return int(d.bought.get("secadero", 0)),
			"cada": func(n: int, _m: Dictionary) -> float: return 14.0 / n,
			"listo": func(j) -> bool: return Maderas.ORDEN_CORTES.any(func(c: String) -> bool: return j.estado.d.res.get(Maderas.clave("humeda", c), 0) > 0),
			"correr": func(j, _n: int) -> void:
				for c: String in Maderas.ORDEN_CORTES:
					if j.estado.d.res.get(Maderas.clave("humeda", c), 0) > 0:
						j.estado.sumar(Maderas.clave("humeda", c), -1)
						j.estado.sumar(Maderas.clave("pino", c), 1)
						return,
		},
	]
	return _lista
