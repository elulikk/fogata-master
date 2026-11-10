class_name Tutorial
# Los primeros pasos: el jugador prende su primer fuego con el pedernal. Cada paso se muestra abajo hasta que se cumple.
# hecho(juego, mano): mano es el id de lo que tiene en la mano. Para sumar un paso alcanza con una entrada.
# El avance se guarda en d.tuto; las partidas viejas lo saltean.


static func pasos() -> Array:
	return [
		{
			"texto": "Hace frío. Hay unas ramas en el pozo y tenés un pedernal: elegilo abajo (P).",
			"hecho": func(j: Juego, mano: String) -> bool: return mano == "pedernal" or j.hay_fuego(),
		},
		{
			"texto": "Hacé clic sobre las ramas para golpear el pedernal. Insistí: no siempre prende la chispa.",
			"hecho": func(j: Juego, _m: String) -> bool: return j.hay_fuego(),
		},
		{
			"texto": "¡Prendió! Las chispas que suben valen calor: pasá el cursor por encima para juntarlas.",
			"hecho": func(j: Juego, _m: String) -> bool: return j.estado.d.meta.stats.orbs >= 3,
		},
		{
			"texto": "Alimentá el fuego antes de que se apague: elegí una rama en la pila (1) y hacé clic en el pozo.",
			"hecho": func(j: Juego, _m: String) -> bool: return int(j.estado.d.soltadas) >= 2,
		},
	]
