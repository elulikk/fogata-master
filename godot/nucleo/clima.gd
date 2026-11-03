class_name Clima
extends RefCounted
# Lluvia, viento y tormentas que aparecen de a poco. Siempre avisa antes con el pronóstico.

const INFO := {"lluvia": {"icono": "🌧️", "nombre": "Lluvia"}, "viento": {"icono": "🌬️", "nombre": "Viento"}, "tormenta": {"icono": "⛈️", "nombre": "Tormenta"}}

var lluvia := 0.0
var viento := 0.0
var fase := "calma"
var reloj := 20.0
var suceso := {}
var relampago := 0.0
var _meta_lluvia := 0.0
var _meta_viento := 0.0


func _elegir(abierto: Dictionary, avance: float) -> Dictionary:
	var tipos := ["lluvia"]
	if abierto.get("viento", false):
		tipos.append("viento")
	if abierto.get("tormentas", false):
		tipos.append_array(["tormenta", "lluvia"])
	var tipo: String = tipos.pick_random()
	match tipo:
		"lluvia": return {"tipo": tipo, "lluvia": randf_range(0.35, 0.8) + minf(0.3, avance * 0.05), "viento": 0.0, "dura": randf_range(25.0, 45.0)}
		"viento": return {"tipo": tipo, "lluvia": 0.0, "viento": randf_range(0.5, 1.0), "dura": randf_range(25.0, 40.0)}
	return {"tipo": tipo, "lluvia": 1.0, "viento": randf_range(0.5, 0.9), "dura": randf_range(30.0, 50.0)}


func tick(dt: float, abierto: Dictionary, avance: float) -> void:
	if abierto.get("clima", false):
		reloj -= dt
		if reloj <= 0.0:
			match fase:
				"calma":
					suceso = _elegir(abierto, avance)
					fase = "aviso"
					reloj = 15.0
				"aviso":
					fase = "activo"
					reloj = suceso.dura
					_meta_lluvia = suceso.lluvia
					_meta_viento = suceso.viento
				"activo":
					fase = "calma"
					reloj = randf_range(70.0, 130.0) / (1.0 + avance * 0.08)
					_meta_lluvia = 0.0
					_meta_viento = 0.0
	lluvia = move_toward(lluvia, _meta_lluvia, dt * 0.25)
	viento = move_toward(viento, _meta_viento, dt * 0.3)
	relampago = maxf(0.0, relampago - dt * 4.0)
	if fase == "activo" and suceso.tipo == "tormenta" and randf() < dt * 0.12:
		relampago = 1.0


func pronostico() -> Dictionary:
	if fase == "calma":
		return {}
	return {"fase": fase, "tipo": suceso.tipo, "reloj": maxf(0.0, reloj)}
