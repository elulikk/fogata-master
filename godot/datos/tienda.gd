class_name Tienda
# Lo que se compra en Pyroshop y lo que se construye. Se paga solo con calor.
# Cada ítem aparece cuando se cumple `requiere`, así el juego se abre de a poco.
# mercado: el precio sube con la demanda y baja solo. efectos: ver datos/mods.gd. pozo: aplica a esa fogata.
# accion: qué hace al comprarlo, sin tocar el juego por fuera de sus funciones.

# Segundos en que la demanda de un consumible baja un punto.
const RECUPERA_MERCADO := 15.0

static var _fijos: Array = []


static func _crece(base: float, k: float, n: float) -> int:
	return roundi(base * pow(k, n))


# Con la demanda el precio sube de a poco y se frena en ×3.
static func _suave(base: float, k: float, n: float) -> int:
	return roundi(base * minf(3.0, pow(k, n)))


static func mejor_fogon(d: Dictionary) -> int:
	var mejor := 0
	for p: Dictionary in d.pits:
		mejor = maxi(mejor, int(p.size))
	return mejor


# ¿Alguna fogata acepta este corte?
static func corte_abierto(d: Dictionary, corte: String) -> bool:
	for p: Dictionary in d.pits:
		if Fogones.de(int(p.size)).cupo[corte] > 0:
			return true
	return false


static func madera_abierta(d: Dictionary, especie: String, corte: String) -> bool:
	return d.unlocked.get("tienda", false) and corte_abierto(d, corte) and mejor_fogon(d) >= int(Maderas.ESPECIES[especie].fogon)


static func _fijos_lista() -> Array:
	if not _fijos.is_empty():
		return _fijos
	var abierto := func(d: Dictionary, id: String) -> bool: return d.unlocked.get(id, false)
	for sp: String in Maderas.ORDEN_ESPECIES:
		if Maderas.ESPECIES[sp].fogon < 0:
			continue
		for corte: String in Maderas.ORDEN_CORTES:
			var c: Dictionary = Maderas.CORTES[corte]
			var clave := Maderas.clave(sp, corte)
			var unidad: float = c.manojo * c.precio * Maderas.ESPECIES[sp].precio
			_fijos.append({
				"id": "madera_" + clave, "tab": "pyroshop", "mercado": true, "icono": "🪵", "clave": clave,
				"nombre": "%s de %s" % [c.nombre, Maderas.ESPECIES[sp].nombre.to_lower()], "desc": "+%d · %s" % [c.manojo, Maderas.ESPECIES[sp].desc],
				"requiere": func(d: Dictionary) -> bool: return madera_abierta(d, sp, corte),
				"costo": func(n: float) -> int: return _suave(unidad, 1.08, n),
				"accion": func(j) -> void: j.estado.sumar(clave, c.manojo),
			})
	_fijos.append_array([
		{
			"id": "fosforos", "tab": "pyroshop", "mercado": true, "icono": "📦", "nombre": "Caja de fósforos", "desc": "+4 fósforos. Si te sobran, no se ofrecen.",
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "tienda") and d.res.get("fosforo", 0) < 5,
			"costo": func(n: float) -> int: return _suave(15.0, 1.12, n),
			"accion": func(j) -> void: j.estado.sumar("fosforo", 4),
		},
		{
			"id": "pinas", "tab": "pyroshop", "mercado": true, "icono": "🌰", "nombre": "Bolsa de piñas", "desc": "+3 piñas: prenden al toque y largan una llamarada.",
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "tienda") and d.totalCalor >= 1100 and d.res.get("pina", 0) < 8,
			"costo": func(n: float) -> int: return _suave(50.0, 1.1, n),
			"accion": func(j) -> void: j.estado.sumar("pina", 3),
		},
		{
			"id": "fuelle", "tab": "pyroshop", "icono": "🪗", "nombre": "Fuelle", "desc": "Herramienta: soplá una fogata prendida para más llama y calor.", "max": 1, "meta": 8,
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "tienda") and d.totalCalor >= 170,
			"costo": func(_n: float) -> int: return 120,
		},
		{
			"id": "ayudante", "tab": "construir", "icono": "🪓", "nombre": "Leñador", "desc": "Te trae leña a la pila. Cada nivel viene más seguido.", "max": 5, "meta": 2,
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "construir") and d.totalCalor >= 250,
			"costo": func(n: float) -> int: return _crece(320.0, 1.7, n),
		},
		{
			"id": "cuidador", "tab": "construir", "icono": "🧤", "nombre": "Cuidador del fuego", "desc": "Carga solo la leña de la pila en las fogatas prendidas y rastrilla la ceniza que las ahoga. Cada nivel, más seguido.", "max": 3, "meta": 7,
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "construir") and d.totalCalor >= 1200,
			"costo": func(n: float) -> int: return _crece(900.0, 2.0, n),
		},
		{
			"id": "hacha", "tab": "construir", "icono": "🪓", "nombre": "Hacha para el leñador", "desc": "El leñador también te trae troncos.", "max": 1, "meta": 4,
			"requiere": func(d: Dictionary) -> bool: return d.bought.get("ayudante", 0) > 0 and corte_abierto(d, "tronco"),
			"costo": func(_n: float) -> int: return 450,
		},
		{
			"id": "canasta", "tab": "construir", "icono": "🛒", "nombre": "Carretilla", "desc": "El leñador trae 25% más en cada entrega.", "max": 3, "meta": 6, "efectos": {"loot": 0.25},
			"requiere": func(d: Dictionary) -> bool: return d.bought.get("ayudante", 0) > 0,
			"costo": func(n: float) -> int: return _crece(500.0, 2.1, n),
		},
		{
			"id": "lenera", "tab": "construir", "icono": "🏚️", "nombre": "Leñera techada", "desc": "La lluvia no moja tu pila y el leñador la llena hasta el doble.", "max": 1, "meta": 5, "efectos": {"pile_cap": 1.0},
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "construir") and d.totalCalor >= 450,
			"costo": func(_n: float) -> int: return 550,
		},
		{
			"id": "secadero", "tab": "construir", "icono": "🧱", "nombre": "Secadero", "desc": "Vuelve seca la madera húmeda. Cada nivel va más rápido.", "max": 3, "meta": 9,
			"requiere": func(d: Dictionary) -> bool: return abierto.call(d, "construir") and d.totalCalor >= 800,
			"costo": func(n: float) -> int: return _crece(700.0, 1.7, n),
		},
	])
	return _fijos


static func _de_fogatas(d: Dictionary) -> Array:
	var fuera := []
	for i in d.pits.size():
		var tam := int(d.pits[i].size)
		var etiqueta := " · fogata %d" % (i + 1) if d.pits.size() > 1 else ""
		fuera.append({
			"id": "techo_%d" % i, "tab": "construir", "icono": "🛖", "nombre": "Techo" + etiqueta, "desc": "La lluvia no le cae a esta fogata.", "max": 1, "pozo": i, "meta": 3 + 4 * i,
			"requiere": func(s: Dictionary) -> bool: return s.unlocked.get("clima", false) and not Fogones.ventajas(tam).cubierto,
			"costo": func(_n: float) -> int: return roundi(280.0 * (1.0 + i * 1.5) * (1.0 + 0.9 * tam)),
			"accion": func(j) -> void: j.poner_techo(i),
		})
		var sigue: Dictionary = Fogones.de(tam + 1) if tam < Fogones.MAXIMO else {}
		if sigue.is_empty():
			continue
		var cupo: Dictionary = sigue.cupo
		fuera.append({
			"id": "agrandar_%d" % i, "tab": "construir", "icono": "🔨", "nombre": "Evolucionar a %s%s" % [sigue.nombre, etiqueta], "max": 99, "pozo": i, "meta": 1 + 9 * i, "agrandar": true,
			"desc": "Entran %d ramas, %d leñas y %d troncos. Calor ×%s. %s" % [cupo.rama, cupo.lena, cupo.tronco, str(sigue.mult), sigue.get("ventaja", {}).get("texto", "")],
			"requiere": func(s: Dictionary) -> bool: return s.unlocked.get("construir", false) and s.totalCalor >= sigue.costo * 0.5,
			"bloqueado": func(s: Dictionary) -> String:
				var tamanos := []
				for p: Dictionary in s.pits:
					tamanos.append(int(p.size))
				tamanos[i] = tam + 1
				return Fogones.no_entra(tamanos),
			"costo": func(_n: float) -> int: return roundi(sigue.costo * (1.0 + i * 0.5)),
			"accion": func(j) -> void: j.agrandar(i),
		})
	if d.pits.size() < 3:
		var i: int = d.pits.size()
		fuera.append({
			"id": "fogata_%d" % i, "tab": "construir", "icono": "🔥", "nombre": "Nueva fogata" if i == 1 else "Tercera fogata", "desc": "Otro pozo de piedras. Más fogatas, más calor.", "max": 1, "meta": 3 if i == 1 else 12,
			"requiere": func(s: Dictionary) -> bool: return s.unlocked.get("construir", false) and s.totalCalor >= (900 if i == 1 else 4000),
			"bloqueado": func(s: Dictionary) -> String:
				var tamanos := [0]
				for p: Dictionary in s.pits:
					tamanos.append(int(p.size))
				return Fogones.no_entra(tamanos),
			"costo": func(_n: float) -> int: return 1100 if i == 1 else 4500,
			"accion": func(j) -> void: j.nueva_fogata(),
		})
	return fuera


static func todos(d: Dictionary) -> Array:
	return _fijos_lista() + _de_fogatas(d)


# Ítems que dan efectos permanentes: los lee Estado.recalcular.
static func con_efectos() -> Array:
	return _fijos_lista().filter(func(it: Dictionary) -> bool: return it.has("efectos"))
