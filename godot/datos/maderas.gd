class_name Maderas
# Cada pieza es una especie en un corte; las claves son especie_corte (roble_tronco). La tabla se arma cruzando las dos listas.
# Unidades: prende = temperatura (0..1+); tibia = segundos para calentarse; combustible = segundos de llama plena;
# calor = lo que irradia a pleno; largo_px y grosor_px = área para la economía; largo y radio = metros en el mundo.

const CORTES := {
	"rama": {
		"nombre": "Rama", "plural": "ramas", "manojo": 2, "precio": 1.0, "largo_px": 84, "grosor_px": 13, "largo": 0.58, "radio": 0.024,
		"prende": 0.12, "tibia": 0.25, "combustible": 22.0, "calor": 1.2, "chasquido": 5.0, "chispas": 1.3, "humo": 0.35,
		"pista": "Prende con un fósforo o casi nada de calor",
	},
	"lena": {
		"nombre": "Leña", "plural": "leñas", "manojo": 2, "precio": 7.0, "largo_px": 116, "grosor_px": 22, "largo": 0.74, "radio": 0.052,
		"prende": 0.77, "tibia": 1.25, "combustible": 30.0, "calor": 1.9, "chasquido": 3.5, "chispas": 1.0, "humo": 0.3,
		"pista": "Prende con ramas ardiendo",
		"modelos": ["lena_umoibcnhw", "lena_vddjehsaa"], # ver mundo/modelos.gd
	},
	"tronco": {
		"nombre": "Tronco", "plural": "troncos", "manojo": 1, "precio": 20.0, "largo_px": 155, "grosor_px": 34, "largo": 0.92, "radio": 0.09,
		"prende": 5.0, "tibia": 6.25, "combustible": 75.0, "calor": 2.4, "chasquido": 2.0, "chispas": 0.8, "humo": 0.6,
		"pista": "Prende solo con un fuego fuerte",
	},
}
const ORDEN_CORTES := ["rama", "lena", "tronco"]

# Los números multiplican a los del corte. fogon: escalón que la abre; peso: qué tan seguido la traen las entregas.
const ESPECIES := {
	"pino": {
		"nombre": "Pino", "desc": "Prende enseguida y chisporrotea, pero se consume rápido.", "fogon": 0, "precio": 1.0, "peso": 5,
		"prende": 0.7, "tibia": 0.7, "combustible": 0.8, "calor": 0.9, "humo": 1.5, "chasquido": 1.5, "chispas": 1.3, "color": Color("8a5a36"),
	},
	"lenga": {
		"nombre": "Lenga", "desc": "Pareja en todo: la leña de todos los días.", "fogon": 1, "precio": 1.4, "peso": 4,
		"prende": 1.0, "tibia": 1.0, "combustible": 1.0, "calor": 1.0, "humo": 1.0, "chasquido": 1.0, "chispas": 1.0, "color": Color("7c6250"),
	},
	"rauli": {
		"nombre": "Raulí", "desc": "Llama alta y limpia, con poco humo.", "fogon": 2, "precio": 2.0, "peso": 3,
		"prende": 1.1, "tibia": 1.1, "combustible": 1.15, "calor": 1.2, "humo": 0.6, "chasquido": 0.8, "chispas": 0.9, "color": Color("7a4632"),
	},
	"roble": {
		"nombre": "Roble", "desc": "Tarda en prender, dura mucho y calienta parejo.", "fogon": 3, "precio": 2.8, "peso": 2,
		"prende": 1.3, "tibia": 1.4, "combustible": 1.6, "calor": 1.2, "humo": 0.8, "chasquido": 0.7, "chispas": 0.7, "color": Color("54483c"),
	},
	"quebracho": {
		"nombre": "Quebracho", "desc": "Durísimo: necesita buen fuego, pero rinde como ninguno.", "fogon": 5, "precio": 5.0, "peso": 1,
		"prende": 1.7, "tibia": 2.0, "combustible": 2.5, "calor": 1.5, "humo": 0.5, "chasquido": 0.5, "chispas": 0.6, "color": Color("3f2620"),
	},
	"humeda": {
		"nombre": "Húmeda", "desc": "Madera mojada: primero se seca, humea y chilla. El secadero la recupera.", "fogon": -1, "precio": 0.0, "peso": 0,
		"prende": 1.3, "tibia": 1.8, "combustible": 0.95, "calor": 0.5, "humo": 2.6, "chasquido": 0.9, "chispas": 0.8, "color": Color("4a4034"),
		"humedad": 1.0, "secado": 9.0,
	},
}
const ORDEN_ESPECIES := ["pino", "lenga", "rauli", "roble", "quebracho", "humeda"]

static var _tabla := {}


static func clave(especie: String, corte: String) -> String:
	return "%s_%s" % [especie, corte]


static func todas() -> Dictionary:
	if not _tabla.is_empty():
		return _tabla
	for sp: String in ORDEN_ESPECIES:
		var s: Dictionary = ESPECIES[sp]
		for i in ORDEN_CORTES.size():
			var corte: String = ORDEN_CORTES[i]
			var c: Dictionary = CORTES[corte]
			_tabla[clave(sp, corte)] = {
				"nombre": "%s de %s" % [c.nombre, s.nombre.to_lower()], "corto": c.nombre, "desc": s.desc, "pista": c.pista,
				"especie": sp, "corte": corte, "nivel": i, "largo_px": c.largo_px, "grosor_px": c.grosor_px,
				"largo": c.largo, "radio": c.radio, "color": s.color, "cono": false, "modelos": c.get("modelos", []),
				"humedad": s.get("humedad", 0.0), "secado": s.get("secado", 6.0),
				"prende": c.prende * s.prende, "tibia": c.tibia * s.tibia, "combustible": c.combustible * s.combustible,
				"calor": c.calor * s.calor, "humo": c.humo * s.humo, "chasquido": c.chasquido * s.chasquido, "chispas": c.chispas * s.chispas,
				"sigue": clave(sp, ORDEN_CORTES[i - 1]) if i > 0 else "",
			}
	# La piña ocupa un lugar de rama, prende al toque y larga una llamarada.
	_tabla["pina"] = {
		"nombre": "Piña", "corto": "Piña", "desc": "Llena de resina: prende al toque y larga una llamarada.", "pista": "",
		"especie": "pina", "corte": "rama", "nivel": 0, "largo_px": 34, "grosor_px": 34, "largo": 0.14, "radio": 0.06,
		"color": Color("7a5233"), "cono": true, "modelos": [], "humedad": 0.0, "secado": 6.0,
		"prende": 0.08, "tibia": 0.2, "combustible": 6.0, "calor": 3.0, "humo": 0.5, "chasquido": 9.0, "chispas": 3.0, "sigue": "",
	}
	return _tabla


static func de(k: String) -> Dictionary:
	return todas()[k]


static func es_madera(k: String) -> bool:
	return todas().has(k)


# Especie de una entrega según tu mejor fogata: las nuevas aparecen menos que las comunes.
static func sortear_especie(mejor_fogon: int) -> String:
	var abiertas: Array = ORDEN_ESPECIES.filter(func(sp: String) -> bool: return ESPECIES[sp].fogon >= 0 and mejor_fogon >= ESPECIES[sp].fogon)
	var total := 0
	for sp: String in abiertas:
		total += ESPECIES[sp].peso
	var tiro := randf() * total
	for sp: String in abiertas:
		tiro -= ESPECIES[sp].peso
		if tiro < 0.0:
			return sp
	return abiertas[0]
