class_name Ui
extends CanvasLayer
# Toda la interfaz: HUD, pila de leña, herramientas y ventanas. Lee el estado y le pide cosas a `juego`.
# Cualquier ventana abierta pausa el juego.

signal mano_cambia(tipo: String, id: String)
signal sonar(nombre: String)

const VENTANAS_TECLA := {KEY_S: "pyroshop", KEY_C: "construir", KEY_H: "arbol", KEY_A: "cenizas"}

var juego: Juego
var sonidos: Sonidos
var mano_tipo := "madera"
var mano_id := "pino_rama"

var _raiz: Control
var _calor: Label
var _ritmo: Label
var _nivel: Label
var _barra_nivel: ProgressBar
var _objetivo: Label
var _pronostico: Label
var _noche: Label
var _barra_frio: ProgressBar
var _avisos: VBoxContainer
var _pista: Label
var _pila: GridContainer
var _pila_firma := ""
var _celdas := {}
var _herramientas := {}
var _acciones := {}
var _ayudantes: Label
var _velo: ColorRect
var _ventana: Ventana
var _nombre_ventana := ""
var _reloj := 0.0


func _init(j: Juego, s: Sonidos) -> void:
	juego = j
	sonidos = s
	process_mode = Node.PROCESS_MODE_ALWAYS


func _ready() -> void:
	_raiz = Control.new()
	_raiz.set_anchors_preset(Control.PRESET_FULL_RECT)
	_raiz.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.theme = Tema.crear()
	add_child(_raiz)
	_crear_hud()
	_crear_pila()
	_crear_herramientas()
	_crear_acciones()
	_velo = ColorRect.new()
	_velo.color = Color(0.0, 0.0, 0.0, 0.55)
	_velo.set_anchors_preset(Control.PRESET_FULL_RECT)
	_velo.visible = false
	_raiz.add_child(_velo)


func _ancla(c: Control, preset: int) -> void:
	c.set_anchors_and_offsets_preset(preset, Control.PRESET_MODE_MINSIZE, 12)


func _crear_hud() -> void:
	var izq := VBoxContainer.new()
	izq.position = Vector2(14, 10)
	izq.custom_minimum_size.x = 300
	izq.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(izq)
	var fila := HBoxContainer.new()
	izq.add_child(fila)
	fila.add_child(Tema.con_contorno(Tema.etiqueta("$", 34, Tema.CALOR)))
	_calor = Tema.con_contorno(Tema.etiqueta("0", 34))
	fila.add_child(_calor)
	_ritmo = Tema.con_contorno(Tema.etiqueta("+0 /s", 16, Tema.CALOR))
	izq.add_child(_ritmo)
	_nivel = Tema.con_contorno(Tema.etiqueta("Nivel 1", 15))
	izq.add_child(_nivel)
	_barra_nivel = _barra(Tema.CALOR)
	izq.add_child(_barra_nivel)
	_objetivo = Tema.con_contorno(Tema.etiqueta("", 14, Tema.TEXTO))
	_objetivo.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_objetivo.custom_minimum_size.x = 300
	izq.add_child(_objetivo)

	var centro := VBoxContainer.new()
	centro.set_anchors_preset(Control.PRESET_CENTER_TOP)
	centro.grow_horizontal = Control.GROW_DIRECTION_BOTH
	centro.position.y = 10
	centro.custom_minimum_size.x = 560
	centro.alignment = BoxContainer.ALIGNMENT_BEGIN
	centro.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(centro)
	_pronostico = _centrado(16)
	centro.add_child(_pronostico)
	_noche = _centrado(16)
	centro.add_child(_noche)
	_barra_frio = _barra(Color(0.4, 0.65, 1.0))
	_barra_frio.visible = false
	centro.add_child(_barra_frio)
	_avisos = VBoxContainer.new()
	_avisos.mouse_filter = Control.MOUSE_FILTER_IGNORE
	centro.add_child(_avisos)
	_pista = _centrado(16)
	_pista.add_theme_color_override("font_color", Color(1.0, 0.85, 0.55))
	centro.add_child(_pista)

	var der := HBoxContainer.new()
	der.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	der.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	der.position = Vector2(-14, 10)
	_raiz.add_child(der)
	der.add_child(Tema.boton("⚙️ Menú", func() -> void: abrir("menu")))


func _centrado(tam: int) -> Label:
	var l := Tema.con_contorno(Tema.etiqueta("", tam))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.visible = false
	return l


func _barra(color: Color) -> ProgressBar:
	var b := ProgressBar.new()
	b.show_percentage = false
	b.custom_minimum_size.y = 8
	b.max_value = 1.0
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fondo := StyleBoxFlat.new()
	fondo.bg_color = Color(0, 0, 0, 0.6)
	fondo.set_corner_radius_all(3)
	var lleno := StyleBoxFlat.new()
	lleno.bg_color = color
	lleno.set_corner_radius_all(3)
	b.add_theme_stylebox_override("background", fondo)
	b.add_theme_stylebox_override("fill", lleno)
	return b


# --- Pila de leña: una fila por especie, una columna por corte. Tocar una celda la pone en la mano. ---

func _crear_pila() -> void:
	var marco := PanelContainer.new()
	marco.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	marco.grow_vertical = Control.GROW_DIRECTION_BEGIN
	marco.position = Vector2(14, -14)
	_raiz.add_child(marco)
	var caja := VBoxContainer.new()
	marco.add_child(caja)
	caja.add_child(Tema.etiqueta("LEÑA  (1 · 2 · 3)", 13, Tema.TENUE))
	_pila = GridContainer.new()
	_pila.columns = 1 + Maderas.ORDEN_CORTES.size()
	caja.add_child(_pila)


func _filas_pila() -> Array:
	var d: Dictionary = juego.estado.d
	var filas := []
	for sp: String in Maderas.ORDEN_ESPECIES:
		var abierta: bool = Maderas.ESPECIES[sp].fogon >= 0 and Tienda.mejor_fogon(d) >= int(Maderas.ESPECIES[sp].fogon)
		if abierta or Maderas.ORDEN_CORTES.any(func(c: String) -> bool: return d.res.get(Maderas.clave(sp, c), 0) > 0):
			filas.append(sp)
	if d.res.get("pina", 0) > 0:
		filas.append("pina")
	return filas


func _armar_pila(filas: Array) -> void:
	for h in _pila.get_children():
		_pila.remove_child(h)
		h.queue_free()
	_celdas.clear()
	_pila.add_child(Tema.etiqueta("", 12))
	for corte: String in Maderas.ORDEN_CORTES:
		_pila.add_child(Tema.etiqueta(Maderas.CORTES[corte].nombre, 12, Tema.TENUE))
	for sp: String in filas:
		_pila.add_child(Tema.etiqueta("Piñas" if sp == "pina" else Maderas.ESPECIES[sp].nombre, 13, Tema.TENUE))
		for corte: String in Maderas.ORDEN_CORTES:
			if sp == "pina" and corte != "rama":
				_pila.add_child(Tema.etiqueta("", 12))
				continue
			var clave := "pina" if sp == "pina" else Maderas.clave(sp, corte)
			var w := Maderas.de(clave)
			var b := Tema.boton("0", elegir_madera.bind(clave))
			b.custom_minimum_size = Vector2(58, 26)
			b.tooltip_text = "%s\n%s\n%s" % [w.nombre, w.desc, w.pista]
			_pila.add_child(b)
			_celdas[clave] = b


func elegir_madera(clave: String) -> void:
	mano_tipo = "madera"
	mano_id = clave
	sonar.emit("click")
	mano_cambia.emit(mano_tipo, mano_id)
	_refrescar_mano()


# Con las teclas 1, 2 y 3: la especie de ese corte de la que tengas más.
func elegir_corte(corte: String) -> void:
	var mejor := ""
	var hay := 0
	for k: String in Maderas.todas():
		if Maderas.de(k).corte == corte and not Maderas.de(k).cono and int(juego.estado.d.res.get(k, 0)) > hay:
			hay = int(juego.estado.d.res[k])
			mejor = k
	if not mejor.is_empty():
		elegir_madera(mejor)


func elegir_herramienta(id: String) -> void:
	mano_tipo = "herramienta"
	mano_id = id
	if not Herramientas.de(id).get("sopla", false):
		juego.estado.d.herramienta = id
	sonar.emit("click")
	mano_cambia.emit(mano_tipo, mano_id)
	_refrescar_mano()


func _refrescar_mano() -> void:
	for k: String in _celdas:
		_celdas[k].modulate = Color(1.5, 1.25, 0.7) if mano_tipo == "madera" and mano_id == k else Color.WHITE
	for id: String in _herramientas:
		_herramientas[id].modulate = Color(1.5, 1.25, 0.7) if mano_tipo == "herramienta" and mano_id == id else Color.WHITE


func _crear_herramientas() -> void:
	var fila := HBoxContainer.new()
	fila.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	fila.grow_horizontal = Control.GROW_DIRECTION_BOTH
	fila.grow_vertical = Control.GROW_DIRECTION_BEGIN
	fila.position.y = -14
	_raiz.add_child(fila)
	for h: Dictionary in Herramientas.TODAS:
		var b := Tema.boton(h.nombre, elegir_herramienta.bind(h.id))
		b.custom_minimum_size = Vector2(110, 40)
		b.tooltip_text = h.desc
		fila.add_child(b)
		_herramientas[h.id] = b


func _crear_acciones() -> void:
	var caja := VBoxContainer.new()
	caja.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	caja.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	caja.grow_vertical = Control.GROW_DIRECTION_BEGIN
	caja.position = Vector2(-14, -14)
	_raiz.add_child(caja)
	_ayudantes = Tema.con_contorno(Tema.etiqueta("", 13, Tema.TENUE))
	caja.add_child(_ayudantes)
	for accion: Array in [["pyroshop", "🛒 Pyroshop (S)"], ["construir", "🔨 Construir (C)"], ["arbol", "🌳 Habilidades (H)"], ["cenizas", "🪦 Cenizas (A)"]]:
		var b := Tema.boton(accion[1], abrir.bind(accion[0]))
		b.custom_minimum_size = Vector2(190, 36)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.visible = false
		caja.add_child(b)
		_acciones[accion[0]] = b


# --- Ventanas ---

func hay_ventana() -> bool:
	return _ventana != null


func abrir(nombre: String) -> void:
	if not _acciones.has(nombre) or _acciones[nombre].visible or true:
		cerrar()
		_ventana = _crear_ventana(nombre)
		_nombre_ventana = nombre
		_ventana.cerrar.connect(cerrar)
		_velo.visible = true
		_raiz.add_child(_ventana)
		_ventana.refrescar()
		juego.pausar(true)
		sonar.emit("click")


func cerrar() -> void:
	if _ventana == null:
		return
	_ventana.queue_free()
	_ventana = null
	_nombre_ventana = ""
	_velo.visible = false
	juego.pausar(false)


func alternar(nombre: String) -> void:
	if _nombre_ventana == nombre:
		cerrar()
	elif _acciones[nombre].visible:
		abrir(nombre)


func _crear_ventana(nombre: String) -> Ventana:
	match nombre:
		"pyroshop": return _tienda("🛒 Pyroshop", "pyroshop")
		"construir": return _tienda("🔨 Construir", "construir")
		"arbol": return VentanaArbol.new(juego, func(id: String) -> void:
			if juego.estado.gastar_punto(id):
				sonar.emit("compra")
				juego.estado.guardar())
		"cenizas": return _ventana_cenizas()
		"logros": return _ventana_logros()
		"inicio": return _ventana_inicio()
	return _ventana_menu()


func _tienda(titulo: String, tab: String) -> VentanaTabla:
	return VentanaTabla.new(titulo, func(v: VentanaTabla) -> Array:
		var e := juego.estado
		var d: Dictionary = e.d
		v.poner_info("Calor: $ %s" % Tema.numero(d.calor))
		var fuera := []
		for it: Dictionary in Tienda.todos(d):
			if it.tab != tab or not it.requiere.call(d):
				continue
			var nivel := int(d.bought.get(it.id, 0))
			var tope: int = it.get("max", 99)
			var lleno: bool = not it.get("mercado", false) and nivel >= tope
			var p := e.precio(it, e.nivel_precio(it))
			var motivo: String = it.get("bloqueado", func(_s: Dictionary) -> String: return "").call(d)
			var fila := {"icono": it.icono, "nombre": it.nombre, "desc": motivo if not motivo.is_empty() else it.desc}
			if it.has("clave"):
				fila["dato"] = str(int(d.res.get(it.clave, 0)))
			elif not it.get("mercado", false) and tope < 99:
				fila["dato"] = "%d/%d" % [nivel, tope]
			if lleno:
				fila["texto_boton"] = "Listo"
			else:
				fila["precio"] = "$ %s" % Tema.numero(p)
				fila["puede"] = d.calor >= p and motivo.is_empty()
				fila["accion"] = func() -> void:
					if juego.comprar(it.id):
						v.refrescar()
			fuera.append(fila)
		return fuera)


func _ventana_cenizas() -> VentanaTabla:
	var ventana := VentanaTabla.new("🪦 Cenizas", func(v: VentanaTabla) -> Array:
		var e := juego.estado
		var meta: Dictionary = e.d.meta
		v.poner_info("Ceniza: %d · Amaneceres: %d. Renacer reinicia la partida y conserva esto." % [meta.ash, e.d.night.dawns])
		var fuera := []
		for m: Dictionary in Cenizas.MEJORAS:
			var nivel := int(meta.upgrades.get(m.id, 0))
			var fila := {"icono": m.icono, "nombre": m.nombre, "desc": m.desc, "dato": "%d/%d" % [nivel, m.max]}
			if nivel >= m.max:
				fila["texto_boton"] = "Listo"
			else:
				var costo := Cenizas.costo(m, nivel)
				fila["precio"] = "%d 🪦" % costo
				fila["puede"] = meta.ash >= costo
				fila["accion"] = func() -> void:
					if e.comprar_ceniza(m):
						sonar.emit("compra")
						e.guardar()
						v.refrescar()
			fuera.append(fila)
		return fuera)
	var renacer := Tema.boton("Renacer (+%d)" % juego.estado.ceniza_posible(), func() -> void:
		cerrar()
		juego.renacer())
	renacer.disabled = not juego.estado.puede_renacer()
	renacer.tooltip_text = "Hace falta sobrevivir una noche."
	ventana.poner_extra(renacer)
	return ventana


func _ventana_logros() -> VentanaTabla:
	return VentanaTabla.new("🏆 Logros", func(_v: VentanaTabla) -> Array:
		var fuera := []
		for a: Dictionary in Logros.lista():
			var hecho: bool = juego.estado.d.meta.achievements.get(a.id, false)
			fuera.append({"icono": a.icono, "nombre": a.nombre, "desc": "%s (%s)" % [a.desc, a.premio], "texto_boton": "✔" if hecho else ""})
		return fuera)


func _ventana_menu() -> Ventana:
	var v := Ventana.new("⚙️ Menú", Vector2(420, 300))
	var aj: Dictionary = juego.estado.d.ajustes
	var fila := HBoxContainer.new()
	fila.add_child(Tema.etiqueta("Volumen"))
	var vol := HSlider.new()
	vol.min_value = 0.0
	vol.max_value = 1.0
	vol.step = 0.05
	vol.value = aj.volumen
	vol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vol.value_changed.connect(func(x: float) -> void:
		aj.volumen = x
		sonidos.ajustes(aj.volumen, aj.mudo))
	fila.add_child(vol)
	v.cuerpo.add_child(fila)
	var mudo := CheckBox.new()
	mudo.text = "Silenciar"
	mudo.button_pressed = aj.mudo
	mudo.toggled.connect(func(x: bool) -> void:
		aj.mudo = x
		sonidos.ajustes(aj.volumen, aj.mudo))
	v.cuerpo.add_child(mudo)
	v.cuerpo.add_child(Tema.boton("🏆 Logros", func() -> void: abrir("logros")))
	var nueva := Tema.boton("Partida nueva…", func() -> void: pass)
	nueva.pressed.connect(func() -> void:
		if nueva.text == "Partida nueva…":
			nueva.text = "¿Seguro? Se borra todo"
			return
		cerrar()
		juego.partida_nueva())
	v.cuerpo.add_child(nueva)
	v.cuerpo.add_child(Tema.boton("Guardar y salir", func() -> void:
		juego.estado.guardar()
		get_tree().quit()))
	return v


func _ventana_inicio() -> Ventana:
	var v := Ventana.new("🔥 Fogata Master", Vector2(380, 200))
	var hay := FileAccess.file_exists(Estado.ARCHIVO)
	if hay:
		v.cuerpo.add_child(Tema.boton("Continuar", cerrar))
	v.cuerpo.add_child(Tema.boton("Partida nueva" if hay else "Empezar", func() -> void:
		cerrar()
		if hay:
			juego.partida_nueva()))
	return v


func mostrar_amanecer(info: Dictionary) -> void:
	abrir("menu")
	_ventana.queue_free()
	var v := Ventana.new("🌅 Amaneció" if info.exito else "🥶 El frío ganó esta noche", Vector2(420, 180))
	if info.exito:
		v.cuerpo.add_child(Tema.etiqueta("+%d de ceniza" % info.ceniza, 16, Tema.BIEN))
	if info.punto:
		v.cuerpo.add_child(Tema.etiqueta("+1 punto de habilidad por una buena noche", 15, Tema.BIEN))
	v.cuerpo.add_child(Tema.etiqueta("Calor de la noche: %s · En meta: %d%%" % [Tema.numero(info.calor), roundi(info.proporcion * 100.0)]))
	v.cuerpo.add_child(Tema.boton("Seguir", cerrar))
	v.cerrar.connect(cerrar)
	_ventana = v
	_raiz.add_child(v)


# --- Avisos y texto flotante ---

func avisar(texto: String, tipo := "") -> void:
	var color: Color = {"malo": Tema.MAL, "hito": Color(1.0, 0.85, 0.5), "logro": Tema.BIEN}.get(tipo, Tema.TEXTO)
	var l := _centrado(16)
	l.text = texto
	l.visible = true
	l.add_theme_color_override("font_color", color)
	_avisos.add_child(l)
	while _avisos.get_child_count() > 4:
		_avisos.get_child(0).free()
	var t := l.create_tween()
	t.tween_interval(4.5)
	t.tween_property(l, "modulate:a", 0.0, 0.6)
	t.tween_callback(l.queue_free)


func flotar(pos: Vector2, texto: String, color := Tema.TEXTO) -> void:
	var l := Tema.con_contorno(Tema.etiqueta(texto, 16, color))
	l.position = pos - Vector2(30, 10)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(l)
	var t := l.create_tween().set_parallel()
	t.tween_property(l, "position:y", pos.y - 50.0, 1.1)
	t.tween_property(l, "modulate:a", 0.0, 1.1)
	t.chain().tween_callback(l.queue_free)


# --- Refresco ---

func _process(delta: float) -> void:
	_reloj += delta
	if _reloj < 0.2:
		return
	_reloj = 0.0
	_refrescar_hud()


func _refrescar_hud() -> void:
	var e := juego.estado
	var d: Dictionary = e.d
	var abierto: Dictionary = d.unlocked
	_calor.text = Tema.numero(d.calor)
	_ritmo.text = "+%.1f /s" % e.ritmo
	_nivel.text = "Nivel %d" % d.level + ("  ·  %d puntos" % Habilidades.puntos(d) if abierto.get("habilidades", false) and Habilidades.puntos(d) > 0 else "")
	_barra_nivel.value = Progreso.avance_nivel(d, e.mods.level_ease)
	var obj := e.proximo_objetivo()
	_objetivo.text = "" if obj.is_empty() else "%s %s" % [obj.icono, obj.texto]

	var pron := juego.clima.pronostico()
	_pronostico.visible = not pron.is_empty()
	if not pron.is_empty():
		var info: Dictionary = Clima.INFO[pron.tipo]
		_pronostico.text = "%s %s %s %ds" % [info.icono, info.nombre, "en" if pron.fase == "aviso" else "por", ceili(pron.reloj)]
	var ni := e.info_noche()
	var hay_noche: bool = ni.fase != "off"
	_noche.visible = hay_noche
	_barra_frio.visible = ni.fase == "night"
	if hay_noche:
		match ni.fase:
			"day": _noche.text = "☀️ Día %d · la tarde cae en %ds" % [ni.n, ceili(ni.resta)]
			"dusk": _noche.text = "🌇 Atardecer · la noche %d pide %.1f/s" % [ni.n, ni.meta]
			"night": _noche.text = "🌙 Noche %d · pide %.1f/s · tenés %.1f/s · %ds" % [ni.n, ni.meta, e.ritmo, ceili(ni.resta)]
		_barra_frio.value = d.night.cold

	_avisos.visible = not hay_ventana()
	_pista.text = _pista_actual()
	_pista.visible = not _pista.text.is_empty()

	var filas := _filas_pila()
	var firma := str(filas)
	if firma != _pila_firma:
		_pila_firma = firma
		_armar_pila(filas)
		_refrescar_mano()
	for k: String in _celdas:
		var b: Button = _celdas[k]
		var w := Maderas.de(k)
		var n := int(d.res.get(k, 0))
		b.text = str(n)
		b.visible = not w.cono or n > 0
		b.disabled = n == 0 or not Tienda.corte_abierto(d, w.corte)
	_herramientas.fosforo.text = "🔥 Fósforo ×%d (F)" % int(d.res.get("fosforo", 0))
	_herramientas.pedernal.text = "🪨 Pedernal (P)"
	_herramientas.fuelle.text = "🪗 Fuelle (G)"
	_herramientas.fuelle.visible = d.bought.get("fuelle", 0) > 0

	_acciones.pyroshop.visible = abierto.get("tienda", false)
	_acciones.construir.visible = abierto.get("construir", false)
	_acciones.arbol.visible = abierto.get("habilidades", false)
	_acciones.arbol.text = "🌳 Habilidades (H)" + (" ●%d" % Habilidades.puntos(d) if Habilidades.puntos(d) > 0 else "")
	_acciones.cenizas.visible = abierto.get("noches", false) or d.meta.totalDawns >= 1 or d.meta.prestiges >= 1
	var ayuda := []
	for s: Dictionary in Proveedores.lista():
		if s.has("etiqueta") and s.nivel.call(d) > 0:
			ayuda.append(s.etiqueta)
	_ayudantes.text = "  ".join(ayuda)


func _pista_actual() -> String:
	var e := juego.estado
	var d: Dictionary = e.d
	var fuego := juego.fuego
	if fuego.apagado():
		var hay_cruda := fuego.pozos.any(func(p: Pozo) -> bool: return not p.lenos.is_empty())
		if not hay_cruda:
			return "Se apagó. Elegí ramas en la pila y soltalas en el pozo."
		return "Elegí el fósforo o el pedernal abajo y tocá la leña para prenderla."
	if d.playTime < 25.0 and d.totalCalor < 15.0:
		return "Elegí leña en la pila y hacé clic en el pozo para soltarla."
	if fuego.llamas == 0 and fuego.brasas > 0:
		return "Quedan brasas… poné ramas, que prenden con poco."
	if e.madera_total() == 0 and d.unlocked.get("tienda", false):
		return "No te queda leña: comprá en Pyroshop (S)."
	if d.playTime < 240.0 and d.totalCalor >= 15.0:
		return "Cámara: arrastrá el suelo o clic derecho para girar · rueda para el zoom."
	return ""
