extends Node
# Une todo: las reglas (Juego), lo que se ve (Mundo y vistas), lo que suena y la entrada.
# Clic: soltar leña o usar la herramienta. Clic derecho: tocar leña cruda la devuelve; arrastrar gira la cámara. Rueda: zoom.
# Prueba automática: godot -- --auto=<prefijo de las capturas>

const ALTURA_SOLTAR := 1.25
const FOCO_Y := 0.32
const CADA_SOPLO := 0.42
const VIDA_CHISPAZO := 7.0

var juego := Juego.new()
var mundo: Mundo
var ui: Ui
var sonidos: Sonidos
var camara: Camera3D

var _piezas := {}
var _pozos := {}
var _orbita := Vector2(0.0, 0.5)
var _distancia := 2.6
var _foco := Vector3(0.0, FOCO_Y, 0.0)
var _derecho_arrastro := false
var _derecho_presionado := false
var _arrastrando_vista := false
var _soplando: Pozo
var _reloj_soplo := 0.0
var _chispazos: Array[Dictionary] = []
var _combo := 0
var _combo_t := 0.0
var _auto := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	randomize()
	sonidos = Sonidos.new()
	add_child(sonidos)
	mundo = Mundo.new()
	mundo.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(mundo)
	camara = Camera3D.new()
	camara.fov = 45.0
	mundo.add_child(camara)
	_ubicar_camara()
	ui = Ui.new(juego, sonidos)
	ui.sonar.connect(func(n: String) -> void: sonidos.tocar(n))
	add_child(ui)
	juego.evento.connect(_al_evento)

	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--auto="):
			_auto = true
			_prueba_automatica(arg.trim_prefix("--auto="))
			return
	juego.cargar_o_empezar()
	sonidos.ajustes(juego.estado.d.ajustes.volumen, juego.estado.d.ajustes.mudo)
	ui.abrir("inicio")


func _process(delta: float) -> void:
	var dt := minf(delta, 0.05)
	juego.tick(dt)
	if juego.pausado == 0:
		mundo.actualizar(dt, juego)
		_chispazos_tick(dt)
		if _soplando:
			_reloj_soplo += dt
			if _reloj_soplo >= CADA_SOPLO:
				_reloj_soplo = 0.0
				if _soplando.prendido():
					juego.fuego.soplar(_soplando)
	sonidos.ambiente(0.0 if juego.pausado > 0 else juego.fuego.intensidad, juego.clima.lluvia, juego.clima.viento)


# --- Vistas ---

func _al_evento(nombre: String, datos: Dictionary) -> void:
	match nombre:
		"mundo_nuevo": _rehacer_mundo()
		"leno_nuevo": _crear_pieza(datos)
		"leno_devuelto", "ceniza": _sacar_pieza(datos.leno, nombre == "ceniza")
		"achica":
			_piezas[datos.leno].armar()
			_despertar(datos.leno)
			sonidos.tocar("chasquido", 0.6)
		"pozo_cambia":
			_pozos[datos.pozo].armar()
			_ubicar_pozos()
		"pozo_nuevo":
			_crear_pozo(datos.pozo)
			_ubicar_pozos()
		"encendida": sonidos.tocar("prende", 0.7 if datos.suave else 1.0)
		"chasquido": _chasquido(datos)
		"ahogada": sonidos.tocar("sise", 0.6)
		"soplo": sonidos.tocar("soplo")
		"seca": ui.avisar("La madera húmeda primero se seca: humea y chilla. Después prende.")
		"armada": ui.avisar("🔺 Fogata armada: con los tres cortes tira mejor y rinde más.", "hito")
		"pausa": get_tree().paused = datos.si
		"aviso": ui.avisar(datos.texto, datos.get("tipo", ""))
		"rechazo":
			ui.flotar(get_viewport().get_mouse_position(), datos.texto, Tema.MAL)
			sonidos.tocar("rechazo")
		"sonido": sonidos.tocar(datos.nombre)
		"botin":
			var k: String = datos.clave
			var texto: String = "fósforos" if k == "fosforo" else Maderas.de(k).nombre.to_lower()
			ui.flotar(Vector2(120, get_viewport().get_visible_rect().size.y - 240), "+%d %s" % [datos.n, texto], Tema.BIEN)
		"amanecer": ui.mostrar_amanecer(datos)


func _rehacer_mundo() -> void:
	for v in _piezas.values():
		v.queue_free()
	_piezas.clear()
	for v in _pozos.values():
		v.queue_free()
	_pozos.clear()
	for c in _chispazos:
		c.nodo.queue_free()
	_chispazos.clear()
	for p in juego.fuego.pozos:
		_crear_pozo(p)
	_ubicar_pozos()


func _crear_pozo(p: Pozo) -> void:
	var v := VistaPozo.new()
	mundo.add_child(v)
	v.configurar(p, mundo.ruido, mundo.ruido_normal)
	_pozos[p] = v


# Reparte los pozos en el terreno y centra la cámara. La leña se va con su pozo.
func _ubicar_pozos() -> void:
	var pozos := juego.fuego.pozos
	var total := 0.0
	for p in pozos:
		total += Fogones.huella(p.tam)
	var hueco := clampf((Fogones.TERRENO - total) / maxf(1.0, pozos.size() - 1.0), 0.0, 0.8) if pozos.size() > 1 else 0.0
	var x := -(total + hueco * (pozos.size() - 1)) * 0.5
	var mayor := 0.0
	for p in pozos:
		var h := Fogones.huella(p.tam)
		var nuevo := Vector3(x + h * 0.5, 0.0, 0.0)
		var delta := nuevo - p.centro
		p.centro = nuevo
		_pozos[p].position = nuevo
		for l in p.lenos:
			if _piezas.has(l):
				_piezas[l].global_position += delta
				_piezas[l].sleeping = false
		x += h + hueco
		mayor = maxf(mayor, p.spec().radio)
	_distancia = clampf(maxf(2.6, 1.9 * (total + hueco * (pozos.size() - 1)) * 0.5 + 1.4 + mayor), 2.6, 9.0)
	_ubicar_camara()


func _crear_pieza(datos: Dictionary) -> void:
	var l: Leno = datos.leno
	var v := VistaPieza.new()
	v.configurar(l, mundo.ruido, mundo.ruido_normal)
	mundo.add_child(v)
	var radio: float = l.pozo.spec().radio - l.madera.largo * 0.5 - 0.02
	var giro := Vector3(PI * 0.5 + randf_range(-0.22, 0.22), randf() * TAU, 0.0)
	var lugar: Vector3 = datos.get("lugar", l.pozo.centro + Vector3(randf_range(-0.1, 0.1), 0.0, randf_range(-0.1, 0.1)))
	var plano := Vector2(lugar.x - l.pozo.centro.x, lugar.z - l.pozo.centro.z).limit_length(maxf(radio, 0.05))
	var alto: float = ALTURA_SOLTAR if datos.has("lugar") else l.madera.radio + 0.02
	v.global_transform = Transform3D(Basis.from_euler(giro), l.pozo.centro + Vector3(plano.x, alto, plano.y))
	l.pos = v.global_position
	_piezas[l] = v
	if datos.has("lugar"):
		sonidos.tocar("golpe", 0.5 + l.madera.nivel * 0.25)


func _sacar_pieza(l: Leno, ceniza: bool) -> void:
	if not _piezas.has(l):
		return
	var v: VistaPieza = _piezas[l]
	_piezas.erase(l)
	_despertar(l)
	if ceniza:
		sonidos.tocar("ceniza", 0.6)
		v.leno = null
		v.collision_layer = 0
		var t := v.create_tween()
		t.tween_property(v, "scale", Vector3(0.3, 0.9, 0.3), 0.9)
		t.tween_callback(v.queue_free)
	else:
		v.queue_free()


# Las piezas que pueden estar apoyadas en esta despiertan y se reacomodan.
func _despertar(l: Leno) -> void:
	for otra: Leno in _piezas:
		if otra != l and otra.pos.y >= l.pos.y and otra.pos.distance_to(l.pos) < l.madera.largo * 0.5 + 0.5:
			_piezas[otra].sleeping = false


# --- Chispazos: se juntan pasando el mouse ---

func _chasquido(datos: Dictionary) -> void:
	var l: Leno = datos.leno
	sonidos.tocar("chasquido", datos.fuerza * 0.7, randf_range(0.8, 1.3), 40)
	if not juego.estado.d.unlocked.get("chispazos", false):
		return
	if randf() >= 0.03 * juego.estado.mods.orbs * l.pozo.ventajas.orbs * datos.fuerza:
		return
	var esfera := SphereMesh.new()
	esfera.radius = 0.025
	esfera.height = 0.05
	esfera.radial_segments = 10
	esfera.rings = 6
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(2.5, 1.4, 0.4)
	esfera.material = m
	var nodo := MeshInstance3D.new()
	nodo.mesh = esfera
	mundo.add_child(nodo)
	nodo.global_position = l.pos + Vector3.UP * 0.35
	_chispazos.append({"nodo": nodo, "valor": maxi(1, roundi(1.0 + juego.estado.ritmo * 0.8)), "vida": VIDA_CHISPAZO, "fase": randf() * TAU})


func _chispazos_tick(dt: float) -> void:
	if _combo_t > 0.0:
		_combo_t -= dt
		if _combo_t <= 0.0:
			_combo = 0
	var raton := get_viewport().get_mouse_position()
	var alcance: float = 55.0 * juego.estado.mods.magnet
	for i in range(_chispazos.size() - 1, -1, -1):
		var c := _chispazos[i]
		c.vida -= dt
		c.nodo.position += Vector3(sin(c.fase + c.vida * 2.0) * 0.06, 0.12 * minf(1.0, c.vida), 0.0) * dt
		if camara.unproject_position(c.nodo.global_position).distance_to(raton) <= alcance:
			_juntar(c)
			_chispazos.remove_at(i)
		elif c.vida <= 0.0:
			c.nodo.queue_free()
			_chispazos.remove_at(i)


func _juntar(c: Dictionary) -> void:
	_combo += 1
	_combo_t = 2.2
	var valor := maxi(1, roundi(c.valor * minf(juego.estado.mods.combo_cap, 1.0 + _combo * 0.03)))
	juego.estado.ganar_calor(valor)
	juego.estado.d.meta.stats.orbs += 1
	sonidos.tocar("moneda", 0.8, minf(2.2, 1.0 + _combo * 0.05), 15)
	ui.flotar(camara.unproject_position(c.nodo.global_position), "+%d" % valor, Tema.CALOR)
	c.nodo.queue_free()


# --- Entrada ---

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo:
		_tecla(ev.keycode)
	if ui.hay_ventana():
		return
	if ev is InputEventMouseButton:
		if ev.button_index == MOUSE_BUTTON_LEFT:
			if ev.pressed:
				# Arrastrar desde el suelo vacío gira la cámara (así se maneja con un dedo).
				var suelo: Variant = _punto_en_suelo(ev.position)
				_arrastrando_vista = suelo == null or _pozo_en(suelo) == null
				_clic(ev.position)
			else:
				_arrastrando_vista = false
				_soplando = null
		elif ev.button_index == MOUSE_BUTTON_RIGHT:
			if ev.pressed:
				_derecho_presionado = true
				_derecho_arrastro = false
			else:
				_derecho_presionado = false
				if not _derecho_arrastro:
					_clic_derecho(ev.position)
		elif ev.pressed and ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			_distancia = maxf(1.6, _distancia - 0.25)
			_ubicar_camara()
		elif ev.pressed and ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_distancia = minf(12.0, _distancia + 0.25)
			_ubicar_camara()
	elif ev is InputEventMouseMotion and (_derecho_presionado or _arrastrando_vista):
		_derecho_arrastro = true
		_girar(ev.relative)
	elif ev is InputEventMagnifyGesture:
		_acercar(1.0 / ev.factor)
	elif ev is InputEventPanGesture:
		_girar(ev.delta * 6.0)


func _girar(rel: Vector2) -> void:
	_orbita.x -= rel.x * 0.006
	_orbita.y = clampf(_orbita.y + rel.y * 0.004, 0.12, 1.25)
	_ubicar_camara()


func _acercar(factor: float) -> void:
	_distancia = clampf(_distancia * factor, 1.6, 12.0)
	_ubicar_camara()


func _tecla(k: int) -> void:
	if k == KEY_ESCAPE:
		if ui.hay_ventana():
			ui.cerrar()
		else:
			ui.abrir("menu")
		return
	if Ui.VENTANAS_TECLA.has(k):
		ui.alternar(Ui.VENTANAS_TECLA[k])
		return
	if ui.hay_ventana():
		return
	for i in Maderas.ORDEN_CORTES.size():
		if k == KEY_1 + i:
			ui.elegir_corte(Maderas.ORDEN_CORTES[i])
	for h: Dictionary in Herramientas.TODAS:
		if k == h.tecla and (not h.has("compra") or juego.estado.d.bought.get(h.compra, 0) > 0):
			ui.elegir_herramienta(h.id)


func _punto_en_suelo(pos: Vector2) -> Variant:
	var origen := camara.project_ray_origin(pos)
	var dir := camara.project_ray_normal(pos)
	if dir.y >= -0.01:
		return null
	return origen + dir * (-origen.y / dir.y)


func _pozo_en(punto: Vector3) -> Pozo:
	for p in juego.fuego.pozos:
		if Vector2(punto.x - p.centro.x, punto.z - p.centro.z).length() <= p.spec().radio + 0.35:
			return p
	return null


func _pieza_en(pos: Vector2) -> Dictionary:
	var origen := camara.project_ray_origin(pos)
	var q := PhysicsRayQueryParameters3D.create(origen, origen + camara.project_ray_normal(pos) * 40.0, 1)
	var hit := mundo.get_world_3d().direct_space_state.intersect_ray(q)
	return hit if not hit.is_empty() and hit.collider is VistaPieza else {}


func _clic(pos: Vector2) -> void:
	var suelo: Variant = _punto_en_suelo(pos)
	if suelo == null:
		return
	var p := _pozo_en(suelo)
	if ui.mano_tipo == "madera":
		if p:
			juego.soltar(ui.mano_id, p, suelo)
		return
	var h := Herramientas.de(ui.mano_id)
	if h.get("sopla", false):
		if p and p.prendido():
			_soplando = p
			_reloj_soplo = 0.0
			juego.fuego.soplar(p)
		return
	var hit := _pieza_en(pos)
	if not hit.is_empty():
		var l: Leno = hit.collider.leno
		juego.usar_herramienta(ui.mano_id, hit.position, l.pozo)
	elif p:
		juego.usar_herramienta(ui.mano_id, suelo, p)


func _clic_derecho(pos: Vector2) -> void:
	var hit := _pieza_en(pos)
	if not hit.is_empty() and hit.collider.leno != null:
		juego.devolver(hit.collider.leno)


func _ubicar_camara() -> void:
	var horizontal := cos(_orbita.y) * _distancia
	camara.look_at_from_position(_foco + Vector3(sin(_orbita.x) * horizontal, sin(_orbita.y) * _distancia, cos(_orbita.x) * horizontal), _foco)


# --- Prueba automática: juega por las mismas funciones, mide y captura. Sale sola y no toca la partida guardada. ---

func _esperar(s: float) -> void:
	await get_tree().create_timer(s, true).timeout


func _capturar(ruta: String) -> void:
	await RenderingServer.frame_post_draw
	print("CAPTURA %s error=%d" % [ruta, get_viewport().get_texture().get_image().save_png(ruta)])


func _medir(momento: String) -> void:
	var fuera := 0
	var veloz := 0.0
	var alta := 0.0
	var apoyadas := 0
	for l: Leno in _piezas:
		var v: VistaPieza = _piezas[l]
		if Vector2(l.pos.x - l.pozo.centro.x, l.pos.z - l.pozo.centro.z).length() > l.pozo.spec().radio + 0.1:
			fuera += 1
		veloz = maxf(veloz, v.linear_velocity.length())
		alta = maxf(alta, l.pos.y)
		if l.madera.corte == "rama" and l.pos.y > 0.06:
			apoyadas += 1
	print("MEDICION %s: piezas=%d fuera=%d ramas_apoyadas=%d vel_max=%.3f altura_max=%.2f calor=%.1f ritmo=%.1f fps=%d" % [momento, _piezas.size(), fuera, apoyadas, veloz, alta, juego.estado.d.calor, juego.estado.ritmo, Engine.get_frames_per_second()])


func _prueba_automatica(prefijo: String) -> void:
	sonidos.ajustes(0.0, true)
	juego.estado.bloqueado = true
	juego.partida_nueva()
	var e := juego.estado
	var d: Dictionary = e.d
	var p: Pozo = juego.fuego.pozos[0]
	await _esperar(0.5)
	# Fogatita: solo ramas. La leña se tiene que rechazar.
	print("RECHAZO leña en fogatita: ", juego.no_entra("pino_lena", p) if d.res.get("pino_lena", 0) > 0 else "(sin stock) cupo=%d" % p.cupo("lena", e.mods))
	for i in 3:
		juego.soltar("pino_rama", p, p.centro + Vector3(randf_range(-0.2, 0.2), 0.0, randf_range(-0.2, 0.2)))
		await _esperar(0.3)
	await _esperar(3.0)
	await _capturar(prefijo + "-1-fogatita.png")

	# Pyroshop pausa el juego: el calor no se mueve con la ventana abierta.
	e.ganar_calor(600.0)
	await _esperar(0.5)
	ui.abrir("pyroshop")
	await _esperar(0.3)
	var antes: float = d.calor
	await _esperar(1.0)
	print("PAUSA calor antes=%.2f despues=%.2f pausado=%d arbol_de_escena=%s" % [antes, d.calor, juego.pausado, get_tree().paused])
	await _capturar(prefijo + "-2-pyroshop.png")
	ui.cerrar()

	d.unlocked.habilidades = true
	d.level = 9
	e.gastar_punto("calor")
	e.gastar_punto("curada")
	e.gastar_punto("regateo")
	await _esperar(0.3)
	ui.abrir("arbol")
	await _esperar(0.3)
	await _capturar(prefijo + "-3-arbol.png")
	ui.cerrar()

	# Evoluciona, carga los tres cortes y deja ramas justo sobre los troncos.
	juego.agrandar(0)
	juego.agrandar(0)
	await _esperar(0.3)
	for clave: String in ["pino_lena", "pino_tronco", "pino_rama"]:
		e.sumar(clave, 10)
	for i in 4:
		juego.soltar("pino_rama", p, p.centro + Vector3(randf_range(-0.3, 0.3), 0.0, randf_range(-0.3, 0.3)))
		await _esperar(0.3)
	for i in 4:
		juego.soltar("pino_lena", p, p.centro + Vector3(randf_range(-0.3, 0.3), 0.0, randf_range(-0.3, 0.3)))
		await _esperar(0.45)
	juego.soltar("pino_tronco", p, p.centro)
	await _esperar(2.0)
	for l: Leno in _piezas:
		if l.madera.corte == "tronco":
			for i in 2:
				juego.soltar("pino_rama", p, l.pos + Vector3(randf_range(-0.03, 0.03), 0.0, randf_range(-0.03, 0.03)))
				await _esperar(0.5)
			break
	await _esperar(5.0)
	_medir("a los 5 s")
	await _capturar(prefijo + "-4-fogon.png")

	# Lo construido de cada escalón, y dos fogatas.
	for t in [3, 5, 7]:
		p.cambiar_tam(t)
		d.pits[0].size = t
		_pozos[p].armar()
		_ubicar_pozos()
		await _esperar(0.6)
		await _capturar("%s-5-%s.png" % [prefijo, p.spec().id])
	p.cambiar_tam(2)
	d.pits[0].size = 2
	_pozos[p].armar()
	juego.nueva_fogata()
	await _esperar(1.0)
	await _capturar(prefijo + "-6-dos.png")
	_medir("final")
	print("FIN")
	get_tree().quit()
