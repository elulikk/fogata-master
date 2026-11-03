class_name Cenizas
# Progreso permanente entre partidas. La ceniza se gana al amanecer y al renacer, y se gasta en estas mejoras.
# efectos: ver datos/mods.gd. semilla, hogar y atajo se leen al empezar la partida (Estado.bonos_de_inicio).

const ATAJOS := [["calor", "tienda", "construir", "chispazos"], ["habilidades"], ["clima"]]

const MEJORAS := [
	{"id": "semilla", "icono": "🌱", "nombre": "Semilla de leñador", "desc": "Empezás cada partida con +4 fósforos y +4 ramas por nivel.", "max": 5, "base": 3.0, "k": 1.5},
	{"id": "cosecha", "icono": "🌾", "nombre": "Cosecha de brasas", "desc": "+8% de calor de todas las fogatas, para siempre.", "max": 10, "base": 3.0, "k": 1.45, "efectos": {"cosecha": 0.08}},
	{"id": "memoria", "icono": "📜", "nombre": "Memoria de fogón", "desc": "Subir de nivel pide 6% menos calor.", "max": 5, "base": 4.0, "k": 1.6, "efectos": {"level_ease": 0.94}},
	{"id": "fiel", "icono": "🧑‍💼", "nombre": "Cliente fiel", "desc": "Pyroshop te cobra 4% menos.", "max": 5, "base": 4.0, "k": 1.6, "efectos": {"discount": 0.96}},
	{"id": "abrigo", "icono": "🧣", "nombre": "Abrigo", "desc": "Las noches piden 8% menos y el frío llega más lento.", "max": 5, "base": 5.0, "k": 1.6, "efectos": {"night_ease": 0.92, "cold_slow": 0.1}},
	{"id": "fortuna", "icono": "🍀", "nombre": "Mano de ceniza", "desc": "+10% de ceniza en cada amanecer y al renacer.", "max": 5, "base": 6.0, "k": 1.8, "efectos": {"ash_bonus": 0.1}},
	{"id": "atajo", "icono": "🧭", "nombre": "Camino conocido", "desc": "Empezás con parte de lo desbloqueado.", "max": 3, "base": 6.0, "k": 2.0},
	{"id": "olfato", "icono": "👃", "nombre": "Olfato de chispa", "desc": "+15% de chispazos y de su alcance.", "max": 5, "base": 4.0, "k": 1.5, "efectos": {"orbs": 0.15, "magnet": 0.15}},
	{"id": "hogar", "icono": "🏡", "nombre": "Hogar heredado", "desc": "Empezás cada partida con una fogata más grande.", "max": 3, "base": 8.0, "k": 2.2},
	{"id": "arquitecto", "icono": "📐", "nombre": "Arquitecto", "desc": "+10% al bonus de las fogatas armadas.", "max": 3, "base": 6.0, "k": 1.8, "efectos": {"structure_bonus": 0.1}},
	{"id": "canteraeterna", "icono": "🪨", "nombre": "Cantera eterna", "desc": "Agrandar fogatas cuesta 5% menos.", "max": 5, "base": 4.0, "k": 1.5, "efectos": {"enlarge_cost": 0.95}},
]


static func costo(m: Dictionary, nivel: int) -> int:
	return roundi(m.base * pow(m.k, nivel))


static func nuevo() -> Dictionary:
	return {"ash": 0, "upgrades": {}, "totalDawns": 0, "prestiges": 0, "totalAsh": 0, "achievements": {}, "stats": {"orbs": 0, "maxRate": 0.0, "armada": 0}}


# Ceniza por renacer ahora: 2,5·(calor/1000)^0,6 + 0,5 por amanecer.
static func por_partida(total_calor: float, mods: Dictionary, amaneceres: int) -> int:
	return floori((2.5 * pow(maxf(0.0, total_calor) / 1000.0, 0.6) + 0.5 * amaneceres) * mods.ash_bonus)
