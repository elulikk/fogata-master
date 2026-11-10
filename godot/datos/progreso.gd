class_name Progreso
# Desbloqueos graduales: el juego arranca casi vacío y se va abriendo. Cada hito se cumple una sola vez.
# en: calor total que lo abre. objetivo: cómo lo anuncia la meta de arriba ("antes" de las compras o "despues").

const HITOS := [
	{"id": "calor", "en": 2, "aviso": "Tu fogata da calor. El calor es tu moneda: juntalo."},
	{"id": "tienda", "en": 15, "objetivo": "antes", "que": "abre Pyroshop, que vende leña", "icono": "🛒", "aviso": "Abrió Pyroshop: te vende leña a cambio de calor."},
	{"id": "construir", "en": 40, "objetivo": "antes", "que": "podés evolucionar la fogata", "icono": "🔨", "aviso": "Ya podés construir: evolucioná la fogata para que entre leña."},
	{"id": "habilidades", "en": 120, "objetivo": "antes", "que": "se abre el árbol de habilidades", "icono": "🌳", "aviso": "Se abrió el árbol de habilidades: al subir de nivel ganás puntos."},
	{"id": "clima", "en": 450, "aviso": "Se está nublando… desde ahora puede llover. Mirá el pronóstico arriba."},
	{"id": "viento", "en": 1600, "objetivo": "despues", "que": "empieza a soplar el viento", "icono": "💨", "aviso": "Empieza a soplar viento: aviva el fuego, pero lo consume más rápido."},
	{"id": "noches", "en": 3000, "objetivo": "despues", "que": "se abren las noches", "icono": "🌙", "aviso": "El día se acorta… la primera noche cae en unos 4 minutos. Aguantá el frío hasta el amanecer."},
	{"id": "tormentas", "en": 5500, "objetivo": "despues", "que": "llegan las tormentas", "icono": "⛈️", "aviso": "Llegan las tormentas. Más vale tener todo techado."},
]

const PRIMEROS_NIVELES := {2: 120, 3: 300, 4: 560, 5: 900, 6: 1400}


# Calor total para llegar a cada nivel.
static func umbral_nivel(nivel: int, facilidad := 1.0) -> int:
	if nivel <= 1:
		return 0
	var base: float = PRIMEROS_NIVELES.get(nivel, 180.0 * pow(1.62, nivel - 2))
	return roundi(base * facilidad)


static func avance_nivel(d: Dictionary, facilidad := 1.0) -> float:
	var desde := umbral_nivel(int(d.level), facilidad)
	var falta := maxi(1, umbral_nivel(int(d.level) + 1, facilidad) - desde)
	return clampf((d.totalCalor - desde) / falta, 0.0, 1.0)
