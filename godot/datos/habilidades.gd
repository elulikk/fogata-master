class_name Habilidades
# Árbol de habilidades: al subir de nivel ganás puntos y los gastás cuando quieras.
# Para sumar una habilidad alcanza con una entrada:
# - rama y fila ubican el nodo; requiere: {habilidad: nivel} abre el nodo; costo: puntos por nivel.
# - efectos: ver datos/mods.gd. proveedor: nombre especial que lee datos/proveedores.gd.

const RAMAS := [
	{"id": "fuego", "nombre": "Fuego", "icono": "🔥"},
	{"id": "lena", "nombre": "Leña", "icono": "🪵"},
	{"id": "oficio", "nombre": "Oficio", "icono": "🪓"},
	{"id": "chispa", "nombre": "Chispas", "icono": "💫"},
	{"id": "noche", "nombre": "Intemperie", "icono": "🌙"},
]

const NODOS := {
	"calor": {"rama": "fuego", "fila": 0, "col": 0, "icono": "🔥", "nombre": "Brasas generosas", "desc": "+15% de calor por nivel.", "max": 8, "costo": 1, "efectos": {"calor": 0.15}},
	"tiraje": {"rama": "fuego", "fila": 1, "col": 0, "icono": "💨", "nombre": "Buen tiraje", "desc": "+10% de aire por nivel: más llama.", "max": 5, "costo": 1, "requiere": {"calor": 2}, "efectos": {"draft": 0.1}},
	"yesca": {"rama": "fuego", "fila": 1, "col": 1, "icono": "✨", "nombre": "Yesca", "desc": "La leña prende más rápido y con menos calor.", "max": 4, "costo": 1, "requiere": {"calor": 1}, "efectos": {"warm": 0.8, "ignite": 0.92}},
	"lecho": {"rama": "fuego", "fila": 2, "col": 1, "icono": "🌫️", "nombre": "Lecho cálido", "desc": "El lecho de brasas suma +0,5 calor/s por nivel.", "max": 4, "costo": 1, "requiere": {"yesca": 1}, "efectos": {"ash_heat": 0.5}},
	"incendio": {"rama": "fuego", "fila": 2, "col": 0, "icono": "🌋", "nombre": "Incendio", "desc": "Cada leño ardiendo desde el 3.º sube el calor 5%.", "max": 3, "costo": 2, "requiere": {"tiraje": 2}, "efectos": {"blaze": 0.05}},
	"combustion": {"rama": "fuego", "fila": 3, "col": 0, "icono": "☄️", "nombre": "Combustión", "desc": "+25% de calor, pero la leña dura 10% menos.", "max": 3, "costo": 3, "requiere": {"incendio": 2}, "efectos": {"calor": 0.25, "fuel_mult": 0.9}},
	"fogonero": {"rama": "fuego", "fila": 3, "col": 1, "icono": "🧑‍🚒", "nombre": "Fogonero", "desc": "El bonus de tamaño llega con menos pozo lleno.", "max": 2, "costo": 3, "requiere": {"lecho": 2}, "efectos": {"fill_threshold": -0.12}},

	"curada": {"rama": "lena", "fila": 0, "col": 0, "icono": "🪵", "nombre": "Leña bien curada", "desc": "La leña dura 15% más por nivel.", "max": 5, "costo": 1, "efectos": {"fuel": 0.15}},
	"brasas": {"rama": "lena", "fila": 1, "col": 0, "icono": "🟠", "nombre": "Brasas tercas", "desc": "Las brasas duran 30% más por nivel.", "max": 5, "costo": 1, "requiere": {"curada": 1}, "efectos": {"embers": 0.3}},
	"piedras": {"rama": "lena", "fila": 2, "col": 0, "icono": "🪨", "nombre": "Piedras refractarias", "desc": "El lecho de brasas se enfría 30% más lento.", "max": 4, "costo": 1, "requiere": {"brasas": 1}, "efectos": {"bed_decay": 0.7}},
	"hueco_rama": {"rama": "lena", "fila": 1, "col": 1, "icono": "🌿", "nombre": "Lugar para ramas", "desc": "+1 rama en cada fogata que las acepte.", "max": 4, "costo": 1, "requiere": {"curada": 1}, "efectos": {"cupo_rama": 1.0}},
	"hueco_lena": {"rama": "lena", "fila": 2, "col": 1, "icono": "🪵", "nombre": "Lugar para leña", "desc": "+1 leña en cada fogata que la acepte.", "max": 3, "costo": 2, "requiere": {"hueco_rama": 2}, "efectos": {"cupo_lena": 1.0}},
	"hueco_tronco": {"rama": "lena", "fila": 3, "col": 1, "icono": "🌳", "nombre": "Lugar para troncos", "desc": "+1 tronco en cada fogata que los acepte.", "max": 2, "costo": 3, "requiere": {"hueco_lena": 2}, "efectos": {"cupo_tronco": 1.0}},
	"resina": {"rama": "lena", "fila": 3, "col": 0, "icono": "🍯", "nombre": "Resina", "desc": "La leña dura 10% más y las entregas traen más piñas.", "max": 4, "costo": 1, "requiere": {"piedras": 1}, "efectos": {"fuel": 0.1, "pinas": 0.25}},

	"regateo": {"rama": "oficio", "fila": 0, "col": 0, "icono": "🤝", "nombre": "Regateo", "desc": "Pyroshop te cobra 10% menos por nivel.", "max": 4, "costo": 1, "efectos": {"discount": 0.9}},
	"cantera": {"rama": "oficio", "fila": 1, "col": 0, "icono": "⛏️", "nombre": "Cantera", "desc": "Agrandar una fogata cuesta 10% menos por nivel.", "max": 3, "costo": 1, "requiere": {"regateo": 1}, "efectos": {"enlarge_cost": 0.9}},
	"chimenea": {"rama": "oficio", "fila": 2, "col": 0, "icono": "🏠", "nombre": "Buen armado", "desc": "Las fogatas con los tres cortes rinden 50% más de su bonus.", "max": 3, "costo": 2, "requiere": {"cantera": 1}, "efectos": {"structure_bonus": 0.5}},
	"tributo": {"rama": "oficio", "fila": 3, "col": 0, "icono": "🎖️", "nombre": "Tributo", "desc": "Al subir de nivel, el fuego regala 12 s de calor.", "max": 3, "costo": 3, "requiere": {"chimenea": 1}, "efectos": {"tribute": 12.0}},
	"sabueso": {"rama": "oficio", "fila": 1, "col": 1, "icono": "🐕", "nombre": "Sabueso", "desc": "Un perro te trae leña cada tanto.", "max": 3, "costo": 1, "requiere": {"regateo": 1}},
	"canasta": {"rama": "oficio", "fila": 2, "col": 1, "icono": "🧺", "nombre": "Ojo de leñador", "desc": "Cada entrega trae 15% más leña.", "max": 5, "costo": 1, "requiere": {"sabueso": 1}, "efectos": {"loot": 0.15}},
	"botas": {"rama": "oficio", "fila": 3, "col": 1, "icono": "🥾", "nombre": "Paso firme", "desc": "Las entregas llegan 15% más seguido.", "max": 4, "costo": 1, "requiere": {"canasta": 1}, "efectos": {"helper_every": 0.85}},

	"chispazos": {"rama": "chispa", "fila": 0, "col": 0, "icono": "💫", "nombre": "Chispas de la suerte", "desc": "Salen 30% más chispazos.", "max": 5, "costo": 1, "efectos": {"orbs": 0.3}},
	"iman": {"rama": "chispa", "fila": 1, "col": 0, "icono": "🧲", "nombre": "Manos rápidas", "desc": "Juntás chispazos desde 40% más lejos.", "max": 3, "costo": 1, "requiere": {"chispazos": 1}, "efectos": {"magnet": 0.4}},
	"cadena": {"rama": "chispa", "fila": 2, "col": 0, "icono": "⛓️", "nombre": "Chispa en cadena", "desc": "Juntar seguido sube el valor de cada chispazo.", "max": 3, "costo": 2, "requiere": {"iman": 1}, "efectos": {"combo_cap": 0.1}},
	"pulmones": {"rama": "chispa", "fila": 3, "col": 0, "icono": "🪗", "nombre": "Pulmones de acero", "desc": "El fuelle sopla 30% más fuerte.", "max": 4, "costo": 1, "requiere": {"cadena": 1}, "efectos": {"bellows": 0.3}},

	"lluvia": {"rama": "noche", "fila": 0, "col": 0, "icono": "☂️", "nombre": "Piel curtida", "desc": "La lluvia afecta 20% menos a tus fogatas.", "max": 4, "costo": 1, "efectos": {"rain_resist": 0.2}},
	"secado": {"rama": "noche", "fila": 1, "col": 0, "icono": "♨️", "nombre": "Secado al calor", "desc": "La madera húmeda se seca 40% más rápido.", "max": 4, "costo": 1, "requiere": {"lluvia": 1}, "efectos": {"dry": 0.4}},
	"vigilia": {"rama": "noche", "fila": 2, "col": 0, "icono": "🌙", "nombre": "Vigilia", "desc": "Las noches piden 12% menos y el frío llega más lento.", "max": 3, "costo": 2, "requiere": {"secado": 1}, "efectos": {"night_ease": 0.88, "cold_slow": 0.2}},
}


static func abierto(d: Dictionary, id: String) -> bool:
	for req: String in NODOS[id].get("requiere", {}):
		if int(d.arbol.get(req, 0)) < int(NODOS[id].requiere[req]):
			return false
	return true


# Puntos: uno por nivel subido, más los que regalan los amaneceres, menos los gastados.
static func puntos(d: Dictionary) -> int:
	var gastados := 0
	for id: String in d.arbol:
		gastados += int(d.arbol[id]) * int(NODOS[id].costo)
	return int(d.level) - 1 + int(d.puntos_extra) - gastados


static func se_puede(d: Dictionary, id: String) -> bool:
	return abierto(d, id) and int(d.arbol.get(id, 0)) < int(NODOS[id].max) and puntos(d) >= int(NODOS[id].costo)
