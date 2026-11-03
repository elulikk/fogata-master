class_name Logros
# Se ganan una vez para siempre y dan una mejora chica permanente. efectos: ver datos/mods.gd.

static var _lista: Array = []


static func _fogon_visto(d: Dictionary, tam: int) -> bool:
	return d.pits.any(func(p: Dictionary) -> bool: return int(p.size) >= tam)


static func lista() -> Array:
	if not _lista.is_empty():
		return _lista
	_lista = [
		{"id": "brasa", "icono": "🔥", "nombre": "Brasa viva", "desc": "Juntá 1.000 de calor en una partida.", "premio": "+1% calor", "efectos": {"calor": 0.01}, "cuando": func(d: Dictionary) -> bool: return d.totalCalor >= 1000},
		{"id": "hoguera", "icono": "🏕️", "nombre": "Hoguera", "desc": "Juntá 10.000 de calor en una partida.", "premio": "+1% calor", "efectos": {"calor": 0.01}, "cuando": func(d: Dictionary) -> bool: return d.totalCalor >= 10000},
		{"id": "infierno", "icono": "🌋", "nombre": "Infierno", "desc": "Juntá 100.000 de calor en una partida.", "premio": "+2% calor", "efectos": {"calor": 0.02}, "cuando": func(d: Dictionary) -> bool: return d.totalCalor >= 100000},
		{"id": "nivel5", "icono": "⭐", "nombre": "Aprendiz", "desc": "Llegá al nivel 5.", "premio": "+1% duración", "efectos": {"fuel": 0.01}, "cuando": func(d: Dictionary) -> bool: return d.level >= 5},
		{"id": "nivel10", "icono": "🌟", "nombre": "Veterano", "desc": "Llegá al nivel 10.", "premio": "+2% duración", "efectos": {"fuel": 0.02}, "cuando": func(d: Dictionary) -> bool: return d.level >= 10},
		{"id": "nivel15", "icono": "💫", "nombre": "Leyenda del fogón", "desc": "Llegá al nivel 15.", "premio": "+2% calor", "efectos": {"calor": 0.02}, "cuando": func(d: Dictionary) -> bool: return d.level >= 15},
		{"id": "patron", "icono": "🪓", "nombre": "Patrón", "desc": "Contratá un leñador.", "premio": "+2% leña", "efectos": {"loot": 0.02}, "cuando": func(d: Dictionary) -> bool: return d.bought.get("ayudante", 0) >= 1},
		{"id": "albanil", "icono": "🧱", "nombre": "Albañil", "desc": "Levantá un Hogar.", "premio": "+3% leña", "efectos": {"loot": 0.03}, "cuando": func(d: Dictionary) -> bool: return _fogon_visto(d, 3)},
		{"id": "herrero", "icono": "🔨", "nombre": "Herrero", "desc": "Levantá una Fragua.", "premio": "+2% calor", "efectos": {"calor": 0.02}, "cuando": func(d: Dictionary) -> bool: return _fogon_visto(d, 5)},
		{"id": "forjador", "icono": "💠", "nombre": "Maestro forjador", "desc": "Levantá la Gran Forja.", "premio": "+3% calor", "efectos": {"calor": 0.03}, "cuando": func(d: Dictionary) -> bool: return _fogon_visto(d, 7)},
		{"id": "doble", "icono": "🔥", "nombre": "Doble fuego", "desc": "Construí una segunda fogata.", "premio": "+1% calor", "efectos": {"calor": 0.01}, "cuando": func(d: Dictionary) -> bool: return d.pits.size() >= 2},
		{"id": "amanecer", "icono": "🌅", "nombre": "Primer amanecer", "desc": "Sobreviví una noche.", "premio": "+5% ceniza", "efectos": {"ash_bonus": 0.05}, "cuando": func(d: Dictionary) -> bool: return d.meta.totalDawns >= 1},
		{"id": "noctambulo", "icono": "🌄", "nombre": "Noctámbulo", "desc": "Sobreviví 5 noches en total.", "premio": "+5% ceniza", "efectos": {"ash_bonus": 0.05}, "cuando": func(d: Dictionary) -> bool: return d.meta.totalDawns >= 5},
		{"id": "renacido", "icono": "🪦", "nombre": "Renacido", "desc": "Renacé por primera vez.", "premio": "+2% calor", "efectos": {"calor": 0.02}, "cuando": func(d: Dictionary) -> bool: return d.meta.prestiges >= 1},
		{"id": "chispero", "icono": "💫", "nombre": "Cazachispas", "desc": "Juntá 100 chispazos en total.", "premio": "+3% chispazos", "efectos": {"orbs": 0.03}, "cuando": func(d: Dictionary) -> bool: return d.meta.stats.orbs >= 100},
		{"id": "armado", "icono": "🛖", "nombre": "Buen armado", "desc": "Armá una fogata con casi todo su cupo ocupado.", "premio": "+1% calor", "efectos": {"calor": 0.01}, "cuando": func(d: Dictionary) -> bool: return d.meta.stats.armada >= 1},
		{"id": "ritmo", "icono": "⚡", "nombre": "A todo fuego", "desc": "Alcanzá 10 calor/s.", "premio": "+1% calor", "efectos": {"calor": 0.01}, "cuando": func(d: Dictionary) -> bool: return d.meta.stats.maxRate >= 10},
	]
	return _lista
