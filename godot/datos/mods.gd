class_name Mods
# Todo lo que se puede mejorar en el juego. Habilidades, mejoras de ceniza, logros y compras declaran
# `efectos: {mod: valor}` y acá se resuelven igual: "suma" acumula valor·nivel, "mult" hace valor^nivel.
# Un efecto nuevo es una línea acá más su lectura donde tenga efecto.

const TABLA := {
	"calor": [1.0, "suma"], "cosecha": [1.0, "suma"], "fuel": [1.0, "suma"], "fuel_mult": [1.0, "mult"], "embers": [1.0, "suma"],
	"warm": [1.0, "mult"], "ignite": [1.0, "mult"], "draft": [1.0, "suma"], "orbs": [0.85, "suma"], "magnet": [1.0, "suma"],
	"loot": [1.0, "suma"], "pinas": [1.0, "suma"], "helper_every": [1.0, "mult"], "pile_cap": [1.0, "suma"], "discount": [1.0, "mult"],
	"dry": [1.0, "suma"], "bed_decay": [1.0, "mult"], "rain_resist": [0.0, "suma"], "bellows": [1.0, "suma"], "level_ease": [1.0, "mult"],
	"combo_cap": [1.0, "suma"], "ash_heat": [0.0, "suma"], "blaze": [0.0, "suma"], "tribute": [0.0, "suma"], "night_ease": [1.0, "mult"],
	"cold_slow": [1.0, "suma"], "ash_bonus": [1.0, "suma"], "enlarge_cost": [1.0, "mult"], "structure_bonus": [1.0, "suma"],
	"fill_threshold": [0.4, "suma"], "orb_value": [1.0, "suma"], "orb_pull": [0.0, "suma"], "cupo_rama": [0.0, "suma"], "cupo_lena": [0.0, "suma"], "cupo_tronco": [0.0, "suma"],
}


static func vacios() -> Dictionary:
	var m := {}
	for k: String in TABLA:
		m[k] = TABLA[k][0]
	return m


static func aplicar(m: Dictionary, efectos: Dictionary, nivel: float) -> void:
	if nivel <= 0.0:
		return
	for k: String in efectos:
		if TABLA[k][1] == "suma":
			m[k] += efectos[k] * nivel
		else:
			m[k] *= pow(efectos[k], nivel)
