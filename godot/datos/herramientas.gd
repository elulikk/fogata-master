class_name Herramientas
# Herramientas de la barra de abajo: se elige una y se usa tocando. Para sumar otra alcanza con agregarla acá.
# recurso: lo que gasta cada uso. calor, dura, alcance (metros): la fuente que deja en el punto.
# acierto: probabilidad de prender; lluvia: cuánto se la baja a pleno. compra: ítem que hace falta tener.
# sopla: en vez de prender, sopla la fogata mientras se mantiene apretado.

const TODAS := [
	{"id": "fosforo", "nombre": "Fósforo", "icono": "🔥", "tecla": KEY_F, "recurso": "fosforo", "sonido": "fosforo", "calor": 0.8, "dura": 1.8, "alcance": 0.65, "acierto": 1.0, "lluvia": 0.5, "desc": "Prende ramas al toque y la leña de pino. Se gasta."},
	{"id": "pedernal", "nombre": "Pedernal", "icono": "🪨", "tecla": KEY_P, "sonido": "pedernal", "calor": 0.5, "dura": 0.6, "alcance": 0.4, "acierto": 0.3, "lluvia": 0.6, "desc": "No se gasta, pero cuesta sacarle una chispa."},
	{"id": "fuelle", "nombre": "Fuelle", "icono": "🪗", "tecla": KEY_G, "compra": "fuelle", "sopla": true, "desc": "Mantené apretado sobre una fogata prendida."},
]


static func de(id: String) -> Dictionary:
	for h: Dictionary in TODAS:
		if h.id == id:
			return h
	return TODAS[0]
