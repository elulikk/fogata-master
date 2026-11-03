extends SceneTree
# Juega sola una partida sin gráficos y mide el balance. Uso: godot --headless --path godot --script pruebas/bot.gd -- <minutos> [sin_rastrillo]
# Carga leña cuando hay lugar, prende lo crudo si se apagó, gasta puntos y compra lo que puede, primero evolucionar.

const PASO := 0.1


func _init() -> void:
	var minutos := 30.0
	var rastrilla := true
	for a in OS.get_cmdline_user_args():
		if a == "sin_rastrillo":
			rastrilla = false
		else:
			minutos = a.to_float()
	var j := Juego.new()
	j.estado.bloqueado = true
	j.partida_nueva()
	var hitos := {}
	var marcar := func(nombre: String, t: float) -> void:
		if not hitos.has(nombre):
			hitos[nombre] = t
			print("%6.1f min  %s  (calor %d, nivel %d, %.1f/s)" % [t / 60.0, nombre, j.estado.d.totalCalor, j.estado.d.level, j.estado.ritmo])
	var soltadas := {"rama": 0, "lena": 0, "tronco": 0}
	var t := 0.0
	var reloj := 0.0
	while t < minutos * 60.0:
		j.tick(PASO)
		t += PASO
		reloj += PASO
		for id: String in j.estado.d.unlocked:
			marcar.call("hito " + id, t)
		for p in j.fuego.pozos:
			marcar.call("fogón %s" % p.spec().nombre, t)
		if reloj < 1.0:
			continue
		reloj = 0.0
		# Un jugador atento: una acción por segundo.
		var d := j.estado.d
		var hecho := false
		for id: String in Habilidades.NODOS:
			if j.estado.gastar_punto(id):
				hecho = true
				break
		var items := Tienda.todos(d).filter(func(it: Dictionary) -> bool: return it.has("meta") and it.requiere.call(d))
		items.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.meta < b.meta)
		for it: Dictionary in items:
			if j.comprar(it.id):
				hecho = true
				break
		for p in j.fuego.pozos:
			if rastrilla and not hecho and p.ceniza >= 0.9 and j.rastrillar(p):
				hecho = true
			if hecho:
				break
			var cruda: Array = p.lenos.filter(func(l: Leno) -> bool: return l.estado == "cruda")
			if not cruda.is_empty() and not p.prendido():
				j.usar_herramienta(d.herramienta, cruda[0].pos, p)
				hecho = true
				break
			for corte: String in ["tronco", "lena", "rama"]:
				if hecho or p.cuantos(corte) >= p.cupo(corte, j.estado.mods):
					continue
				var clave := ""
				for k: String in Maderas.todas():
					var w := Maderas.de(k)
					if w.corte == corte and not w.cono and int(d.res.get(k, 0)) > 0:
						clave = k
				if clave.is_empty():
					for it: Dictionary in Tienda.todos(d):
						if it.has("clave") and Maderas.de(it.clave).corte == corte and it.requiere.call(d) and d.calor > j.estado.precio(it, j.estado.nivel_precio(it)) * 4 and j.comprar(it.id):
							clave = it.clave
							break
				if not clave.is_empty() and j.soltar(clave, p, Vector3.ZERO):
					soltadas[corte] += 1
					hecho = true
		if int(t) % 300 == 0:
			print("%6.1f min  ritmo %.1f/s  calor %d  total %d  nivel %d  ceniza %.2f  soltadas %s" % [t / 60.0, j.estado.ritmo, d.calor, d.totalCalor, d.level, j.fuego.pozos[0].ceniza, str(soltadas)])
	quit()
