class_name Fogones
# Escalera de evolución de la fogata. Para sumar un escalón alcanza con una entrada: tienda, cupos, ventajas y dibujo salen de acá.
# - cupo: cuánta leña de cada corte entra. Agrandar habilita más cantidad y más tipos.
# - radio: metros del pozo; tipis: cuerpos de fuego (acota la intensidad); mult: rendimiento lleno; quema: velocidad de consumo.
# - partes: lo construido alrededor. Cada una es una forma simple (ver mundo/vista_pozo.gd).
# - ventaja: lo que suma el escalón y conservan los siguientes (ver REGLAS).

const PIEDRA := Color(0.3, 0.29, 0.28)
const LADRILLO := Color(0.42, 0.2, 0.14)
const BARRO := Color(0.42, 0.28, 0.17)
const HIERRO := Color(0.1, 0.1, 0.11)

const TODOS := [
	{
		"id": "fogatita", "nombre": "Fogatita", "llama": "fuego", "costo": 0, "radio": 0.5, "piedras": 11, "hileras": 1,
		"cupo": {"rama": 5, "lena": 0, "tronco": 0}, "tipis": 1, "aire": 1.0, "mult": 1.0, "hs": 1.0, "quema": 1.0, "partes": [],
	},
	{
		"id": "fogata", "nombre": "Fogata", "llama": "fuego", "costo": 70, "radio": 0.62, "piedras": 14, "hileras": 1,
		"cupo": {"rama": 6, "lena": 2, "tronco": 0}, "tipis": 1, "aire": 1.05, "mult": 1.5, "hs": 1.2, "quema": 1.05, "partes": [],
		"ventaja": {"texto": "Piedras calzadas: entra leña y las brasas duran más.", "bed_decay": 0.8},
	},
	{
		"id": "fogon", "nombre": "Fogón", "llama": "fuego", "costo": 420, "radio": 0.8, "piedras": 17, "hileras": 2,
		"cupo": {"rama": 6, "lena": 4, "tronco": 1}, "tipis": 1, "aire": 1.1, "mult": 2.0, "hs": 1.4, "quema": 1.15,
		"partes": [{"forma": "caja", "pos": [0, 0.62, 0], "tam": [1.9, 0.03, 0.03], "color": HIERRO}, {"forma": "caja", "pos": [-0.95, 0.31, 0], "tam": [0.03, 0.62, 0.03], "color": HIERRO}, {"forma": "caja", "pos": [0.95, 0.31, 0], "tam": [0.03, 0.62, 0.03], "color": HIERRO}],
		"ventaja": {"texto": "Parrilla de hierro: entra un tronco y la leña prende más rápido.", "ignite": 0.8},
	},
	{
		"id": "hogar", "nombre": "Hogar", "llama": "fuego", "costo": 2000, "radio": 0.95, "piedras": 20, "hileras": 2,
		"cupo": {"rama": 8, "lena": 4, "tronco": 2}, "tipis": 2, "aire": 1.15, "mult": 3.5, "hs": 1.6, "quema": 1.25,
		"partes": [{"forma": "caja", "pos": [0, 0.75, -1.2], "tam": [2.4, 1.5, 0.35], "color": LADRILLO}, {"forma": "caja", "pos": [0, 2.2, -1.2], "tam": [0.7, 1.5, 0.35], "color": LADRILLO}],
		"ventaja": {"texto": "Chimenea de ladrillo: la lluvia no le llega, no hace falta techo.", "cubierto": true},
	},
	{
		"id": "horno", "nombre": "Horno de barro", "llama": "fuego", "costo": 6000, "radio": 1.05, "piedras": 22, "hileras": 2,
		"cupo": {"rama": 8, "lena": 6, "tronco": 3}, "tipis": 2, "aire": 1.2, "mult": 4.5, "hs": 1.8, "quema": 1.0,
		"partes": [{"forma": "esfera", "pos": [0, 0.35, -1.25], "tam": [2.2, 1.7, 1.0], "color": BARRO}, {"forma": "cilindro", "pos": [0, 1.75, -1.25], "tam": [0.28, 1.0, 0.28], "color": BARRO}],
		"ventaja": {"texto": "El barro guarda el calor: gasta menos leña y el lecho casi no se enfría.", "bed_decay": 0.6},
	},
	{
		"id": "fragua", "nombre": "Fragua", "llama": "forja", "costo": 20000, "radio": 1.2, "piedras": 24, "hileras": 3,
		"cupo": {"rama": 10, "lena": 6, "tronco": 4}, "tipis": 2, "aire": 1.25, "mult": 6.4, "hs": 2.0, "quema": 1.7,
		"partes": [{"forma": "caja", "pos": [0, 1.0, -1.45], "tam": [3.0, 2.0, 0.4], "color": HIERRO}, {"forma": "cilindro", "pos": [-1.0, 2.5, -1.45], "tam": [0.4, 1.8, 0.4], "color": HIERRO}, {"forma": "cilindro", "pos": [1.0, 2.5, -1.45], "tam": [0.4, 1.8, 0.4], "color": HIERRO}],
		"ventaja": {"texto": "Fuelle propio: sopla sola y tira más, pero come leña. Abre el quebracho.", "bellows": 0.3},
	},
	{
		"id": "altohorno", "nombre": "Alto horno", "llama": "forja", "costo": 80000, "radio": 1.35, "piedras": 26, "hileras": 3,
		"cupo": {"rama": 12, "lena": 8, "tronco": 6}, "tipis": 3, "aire": 1.3, "mult": 10.0, "hs": 2.2, "quema": 1.8,
		"partes": [{"forma": "cilindro", "pos": [0, 2.0, -1.8], "tam": [2.4, 4.0, 2.4], "color": LADRILLO}, {"forma": "cilindro", "pos": [0, 4.6, -1.8], "tam": [1.2, 1.4, 1.2], "color": HIERRO}],
		"ventaja": {"texto": "Tiro alto: larga muchos más chispazos.", "orbs": 1.6},
	},
	{
		"id": "granforja", "nombre": "Gran Forja", "llama": "azul", "costo": 300000, "radio": 1.5, "piedras": 28, "hileras": 3,
		"cupo": {"rama": 14, "lena": 10, "tronco": 8}, "tipis": 3, "aire": 1.35, "mult": 15.0, "hs": 2.4, "quema": 2.1,
		"partes": [{"forma": "cilindro", "pos": [-1.6, 2.5, -1.8], "tam": [1.6, 5.0, 1.6], "color": HIERRO}, {"forma": "cilindro", "pos": [1.6, 2.5, -1.8], "tam": [1.6, 5.0, 1.6], "color": HIERRO}, {"forma": "caja", "pos": [0, 1.2, -2.0], "tam": [3.0, 2.4, 0.6], "color": LADRILLO}],
		"ventaja": {"texto": "Fuego azul: su calor espanta el frío y las noches piden 20% menos.", "night_ease": 0.8},
	},
]

const MAXIMO := 7
# Metros de terreno para todos los pozos: limita cuántos y cuán grandes conviven.
const TERRENO := 9.0
const MARGEN := 0.3
const LLENO_PARA_MULT := 0.4

# Cómo se acumula cada ventaja de la escalera. Una ventaja nueva es una regla acá más su lectura donde tenga efecto.
const REGLAS := {"bed_decay": "mult", "ignite": "mult", "orbs": "mult", "night_ease": "mult", "bellows": "max", "cubierto": "o"}
const SIN_VENTAJAS := {"bed_decay": 1.0, "ignite": 1.0, "orbs": 1.0, "night_ease": 1.0, "bellows": 0.0, "cubierto": false}

# Fogata armada: con leña de los tres cortes tira mejor, prende más rápido y rinde más.
const ARMADA := {"air": 0.3, "ignite": 0.35, "fuel": 0.1, "calor": 0.28, "tope": 0.3}


static func de(tam: int) -> Dictionary:
	return TODOS[clampi(tam, 0, MAXIMO)]


static func ventajas(tam: int) -> Dictionary:
	var fuera := SIN_VENTAJAS.duplicate()
	for i in clampi(tam, 0, MAXIMO) + 1:
		var v: Dictionary = TODOS[i].get("ventaja", {})
		for k: String in REGLAS:
			if not v.has(k):
				continue
			match REGLAS[k]:
				"mult": fuera[k] *= v[k]
				"max": fuera[k] = maxf(fuera[k], v[k])
				"o": fuera[k] = fuera[k] or v[k]
	return fuera


# Área de leña que llena el pozo sin contar mejoras: base del multiplicador por tamaño.
static func area_base(tam: int) -> float:
	var suma := 0.0
	for corte: String in Maderas.ORDEN_CORTES:
		var c: Dictionary = Maderas.CORTES[corte]
		suma += de(tam).cupo[corte] * c.largo_px * c.grosor_px
	return suma


static func huella(tam: int) -> float:
	return 2.0 * (de(tam).radio + MARGEN)


# Motivo por el que estos pozos no entran en el terreno, o "".
static func no_entra(tamanos: Array) -> String:
	var usado := 0.0
	for t: int in tamanos:
		usado += huella(t)
	return "" if usado <= TERRENO else "No hay terreno: tus fogatas no entran juntas."
