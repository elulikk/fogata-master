class_name Dev
# Menú de desarrollo (F12 o el botón 🛠 arriba a la derecha). No va en el juego final: con ACTIVO en false desaparece.
# Cada botón es una entrada: {icono, nombre, accion(juego)}. Una entrada con solo "seccion" es un título.
# Lo que necesita del mundo (por ejemplo soltar chispas) lo pide con un evento "dev_*" que atiende main.gd.

const ACTIVO := true
const VELOCIDADES := [1.0, 4.0, 10.0]


static func acciones() -> Array:
	return [
		{"seccion": "Recursos"},
		{"icono": "🔥", "nombre": "+1.000 calor", "accion": func(j: Juego) -> void: j.estado.ganar_calor(1000.0)},
		{"icono": "💰", "nombre": "+100.000 calor", "accion": func(j: Juego) -> void: j.estado.ganar_calor(100000.0)},
		{"icono": "🪵", "nombre": "+20 de cada leña", "accion": func(j: Juego) -> void:
			for k: String in Maderas.todas():
				if not Maderas.de(k).cono:
					j.estado.sumar(k, 20)},
		{"icono": "📦", "nombre": "+10 fósforos y piñas", "accion": func(j: Juego) -> void:
			j.estado.sumar("fosforo", 10)
			j.estado.sumar("pina", 10)},
		{"icono": "🪦", "nombre": "+50 ceniza", "accion": func(j: Juego) -> void:
			j.estado.d.meta.ash += 50
			j.estado.d.meta.totalAsh += 50},
		{"icono": "●", "nombre": "+5 puntos de habilidad", "accion": func(j: Juego) -> void:
			j.estado.d.unlocked["habilidades"] = true
			j.estado.d.puntos_extra += 5},
		{"seccion": "Progreso"},
		{"icono": "🔓", "nombre": "Desbloquear todo", "accion": func(j: Juego) -> void: j.dev_desbloquear_todo()},
		{"icono": "⏭", "nombre": "Saltear tutorial", "accion": func(j: Juego) -> void: j.estado.d.tuto = 99},
		{"icono": "🔨", "nombre": "Evolucionar fogata 1", "accion": func(j: Juego) -> void:
			if j.fuego.pozos[0].tam < Fogones.MAXIMO:
				j.agrandar(0)},
		{"icono": "➕", "nombre": "Otra fogata", "accion": func(j: Juego) -> void:
			if j.fuego.pozos.size() < 3:
				j.nueva_fogata()},
		{"icono": "🛒", "nombre": "Todo lo de Pyroshop", "accion": func(j: Juego) -> void: j.dev_comprar_todo()},
		{"seccion": "Fuego"},
		{"icono": "⚡", "nombre": "Prender todo", "accion": func(j: Juego) -> void: j.dev_prender_todo()},
		{"icono": "🧺", "nombre": "Llenar las fogatas", "accion": func(j: Juego) -> void: j.dev_llenar()},
		{"icono": "💫", "nombre": "Lluvia de chispas", "accion": func(j: Juego) -> void: j.evento.emit("dev_chispas", {"n": 30})},
		{"seccion": "Clima y noches"},
		{"icono": "🌧️", "nombre": "Que llueva", "accion": func(j: Juego) -> void: j.dev_clima("lluvia")},
		{"icono": "⛈️", "nombre": "Tormenta", "accion": func(j: Juego) -> void: j.dev_clima("tormenta")},
		{"icono": "☀️", "nombre": "Despejar", "accion": func(j: Juego) -> void: j.dev_clima("")},
		{"icono": "🌙", "nombre": "Que caiga la noche", "accion": func(j: Juego) -> void: j.dev_noche("noche")},
		{"icono": "🌅", "nombre": "Que amanezca", "accion": func(j: Juego) -> void: j.dev_noche("amanecer")},
		{"seccion": "Tiempo"},
		{"icono": "⏩", "nombre": "Velocidad ×1 / ×4 / ×10", "accion": func(_j: Juego) -> void:
			var i := VELOCIDADES.find(Engine.time_scale)
			Engine.time_scale = VELOCIDADES[(i + 1) % VELOCIDADES.size()]},
		{"icono": "🗑", "nombre": "Partida nueva ya", "accion": func(j: Juego) -> void: j.partida_nueva()},
	]
