class_name Ui
extends CanvasLayer
# Toda la interfaz: HUD, pila de leña, herramientas y ventanas. Lee el estado y le pide cosas a `juego`.
# Cualquier ventana abierta pausa el juego.
#
# Distribución de la pantalla:
#   arriba izquierda: calor, nivel y objetivo · arriba al centro: clima, noche y avisos · arriba derecha: menú
#   abajo izquierda: pila de leña · abajo al centro: pista y herramientas · abajo derecha: ventanas del juego

signal mano_cambia(tipo: String, id: String)
signal sonar(nombre: String)

const CENIZA_PIDE_RASTRILLO := 0.9
const MARGEN := 14
const VENTANAS_TECLA := {KEY_S: "pyroshop", KEY_C: "construir", KEY_H: "arbol", KEY_A: "cenizas"}
# Los botones de abajo a la derecha. Para sumar una ventana: una entrada acá, una en VENTANAS_TECLA y su caso en _crear_ventana.
const ACCIONES := [
	{"id": "pyroshop", "icono": "🛒", "nombre": "Pyroshop"},
	{"id": "construir", "icono": "🔨", "nombre": "Construir"},
	{"id": "arbol", "icono": "🌳", "nombre": "Habilidades"},
	{"id": "cenizas", "icono": "🪦", "nombre": "Cenizas"},
]

var juego: Juego
var sonidos: Sonidos
var mano_tipo := "madera"
var mano_id := "pino_rama"

var _raiz: Control
var _calor: Label
var _calor_prev := 0.0
var _ritmo: Label
var _nivel: Label
var _nivel_prev := 0
var _puntos: Label
var _barra_nivel: ProgressBar
var _objetivo_caja: Control
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
var _nombres_h := {}
var _acciones := {}
var _insignias := {}
var _ayudantes: Label
var _velo: ColorRect
var _ventana: Ventana
var _nombre_ventana := ""
var _reloj := 0.0
var _aro: Aro
# Aspecto del botón elegido en la mano.
var _sel: StyleBoxFlat = Tema.caja(Color(0.36, 0.21, 0.08), Tema.ORO, 2, 8, 6.0, 3.0, 6)


# El radio de la red mágica de chispas, alrededor del cursor.
class Aro extends Control:
	var radio := 0.0

	func _process(_d: float) -> void:
		position = get_global_mouse_position()
		queue_redraw()

	func _draw() -> void:
		if radio <= 0.0:
			return
		var latido := 0.5 + 0.5 * sin(Time.get_ticks_msec() * 0.004)
		draw_arc(Vector2.ZERO, radio, 0.0, TAU, 64, Color(1.0, 0.75, 0.35, 0.22 + 0.1 * latido), 2.0, true)
		draw_arc(Vector2.ZERO, radio * 0.97, 0.0, TAU, 64, Color(1.0, 0.6, 0.2, 0.08), 6.0, true)


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
	_crear_abajo()
	_crear_acciones()
	_aro = Aro.new()
	_aro.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(_aro)
	_velo = ColorRect.new()
	_velo.color = Color(0.02, 0.01, 0.0, 0.62)
	_velo.set_anchors_preset(Control.PRESET_FULL_RECT)
	_velo.visible = false
	_raiz.add_child(_velo)


# Fija un contenedor a una esquina o borde, con margen. Crece hacia adentro de la pantalla.
func _ancla(c: Control, preset: int, crece_h := Control.GROW_DIRECTION_END, crece_v := Control.GROW_DIRECTION_END) -> void:
	c.set_anchors_and_offsets_preset(preset, Control.PRESET_MODE_MINSIZE, MARGEN)
	c.grow_horizontal = crece_h
	c.grow_vertical = crece_v


# Una pastilla de texto dentro de `padre`; devuelve la etiqueta (su padre es la pastilla).
func _pastilla_en(padre: Control, tam: int, color := Tema.TEXTO) -> Label:
	var p := Tema.pastilla("", color, tam)
	p.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	p.visible = false
	padre.add_child(p)
	return Tema.texto_de(p)


func _ver(l: Label, visible_: bool) -> void:
	l.get_parent().visible = visible_


func _crear_hud() -> void:
	# Arriba a la izquierda: calor, nivel y objetivo.
	var izq := VBoxContainer.new()
	izq.add_theme_constant_override("separation", 6)
	izq.custom_minimum_size.x = 310
	izq.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(izq)
	var tarjeta := PanelContainer.new()
	tarjeta.theme_type_variation = "Hud"
	izq.add_child(tarjeta)
	var caja := VBoxContainer.new()
	caja.add_theme_constant_override("separation", 2)
	tarjeta.add_child(caja)
	var fila := HBoxContainer.new()
	fila.add_theme_constant_override("separation", 6)
	caja.add_child(fila)
	fila.add_child(Tema.etiqueta("🔥", 30))
	_calor = Tema.etiqueta("0", 38, Tema.TEXTO, true)
	_calor.tooltip_text = "Calor: lo que ganás y gastás en Pyroshop."
	_calor.mouse_filter = Control.MOUSE_FILTER_PASS
	fila.add_child(_calor)
	var vacio := Control.new()
	vacio.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vacio.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fila.add_child(vacio)
	var ritmo := Tema.pastilla("+0.0 /s", Tema.CALOR, 15)
	ritmo.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_ritmo = Tema.texto_de(ritmo)
	fila.add_child(ritmo)
	var fila2 := HBoxContainer.new()
	caja.add_child(fila2)
	_nivel = Tema.etiqueta("Nivel 1", 14, Tema.TENUE, true)
	_nivel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	fila2.add_child(_nivel)
	var puntos := Tema.pastilla("", Tema.ORO, 12)
	puntos.visible = false
	_puntos = Tema.texto_de(puntos)
	fila2.add_child(puntos)
	_barra_nivel = Tema.barra(Tema.CALOR, 8)
	caja.add_child(_barra_nivel)
	_objetivo_caja = PanelContainer.new()
	(_objetivo_caja as PanelContainer).theme_type_variation = "Hud"
	_objetivo = Tema.etiqueta("", 13, Tema.TEXTO)
	_objetivo.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_objetivo_caja.add_child(_objetivo)
	_objetivo_caja.visible = false
	izq.add_child(_objetivo_caja)
	_ancla(izq, Control.PRESET_TOP_LEFT)

	# Arriba al centro: clima, noche y avisos.
	var centro := VBoxContainer.new()
	centro.custom_minimum_size.x = 560
	centro.add_theme_constant_override("separation", 5)
	centro.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(centro)
	_pronostico = _pastilla_en(centro, 15)
	_noche = _pastilla_en(centro, 15)
	_barra_frio = Tema.barra(Tema.FRIO, 10)
	_barra_frio.custom_minimum_size.x = 320
	_barra_frio.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_barra_frio.tooltip_text = "El frío sube si el fuego rinde menos de lo que pide la noche."
	_barra_frio.visible = false
	centro.add_child(_barra_frio)
	_avisos = VBoxContainer.new()
	_avisos.add_theme_constant_override("separation", 4)
	_avisos.mouse_filter = Control.MOUSE_FILTER_IGNORE
	centro.add_child(_avisos)
	_ancla(centro, Control.PRESET_CENTER_TOP, Control.GROW_DIRECTION_BOTH)

	# Arriba a la derecha: menú y ayudantes.
	var der := VBoxContainer.new()
	der.add_theme_constant_override("separation", 6)
	der.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(der)
	var botones := HBoxContainer.new()
	botones.add_theme_constant_override("separation", 6)
	botones.size_flags_horizontal = Control.SIZE_SHRINK_END
	der.add_child(botones)
	if Dev.ACTIVO:
		var dev := Tema.boton("🛠", alternar_dev)
		dev.custom_minimum_size = Vector2(46, 40)
		dev.add_theme_font_size_override("font_size", 18)
		dev.add_theme_color_override("font_color", Tema.FRIO)
		dev.tooltip_text = "Menú de desarrollo (F12). No va en el juego final."
		botones.add_child(dev)
	var menu := Tema.boton("⚙", func() -> void: abrir("menu"))
	menu.custom_minimum_size = Vector2(46, 40)
	menu.add_theme_font_size_override("font_size", 20)
	menu.tooltip_text = "Menú (Esc)"
	botones.add_child(menu)
	_ayudantes = _pastilla_en(der, 12, Tema.TENUE)
	_ayudantes.get_parent().size_flags_horizontal = Control.SIZE_SHRINK_END
	_ancla(der, Control.PRESET_TOP_RIGHT, Control.GROW_DIRECTION_BEGIN)


# --- Pila de leña: una fila por especie, una columna por corte. Tocar una celda la pone en la mano. ---

func _crear_pila() -> void:
	var marco := PanelContainer.new()
	marco.theme_type_variation = "Hud"
	_raiz.add_child(marco)
	var caja := VBoxContainer.new()
	caja.add_theme_constant_override("separation", 4)
	marco.add_child(caja)
	var titulo := HBoxContainer.new()
	caja.add_child(titulo)
	titulo.add_child(Tema.etiqueta("🪵 LEÑA", 13, Tema.ORO, true))
	_pila = GridContainer.new()
	_pila.columns = 1 + Maderas.ORDEN_CORTES.size()
	_pila.add_theme_constant_override("h_separation", 5)
	_pila.add_theme_constant_override("v_separation", 4)
	caja.add_child(_pila)
	_ancla(marco, Control.PRESET_BOTTOM_LEFT, Control.GROW_DIRECTION_END, Control.GROW_DIRECTION_BEGIN)


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


# El nombre de una fila con su muestra de color, para reconocer la especie de un vistazo.
func _nombre_fila(sp: String) -> Control:
	var f := HBoxContainer.new()
	f.add_theme_constant_override("separation", 6)
	var color: Color = Color("6b4a2b") if sp == "pina" else Maderas.ESPECIES[sp].color
	var muestra := Panel.new()
	muestra.custom_minimum_size = Vector2(10, 10)
	muestra.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	muestra.add_theme_stylebox_override("panel", Tema.caja(color.lightened(0.15), color.lightened(0.45), 1, 5, 0.0, 0.0))
	f.add_child(muestra)
	f.add_child(Tema.etiqueta("Piñas" if sp == "pina" else Maderas.ESPECIES[sp].nombre, 13, Tema.TEXTO))
	return f


func _armar_pila(filas: Array) -> void:
	for h in _pila.get_children():
		_pila.remove_child(h)
		h.queue_free()
	_celdas.clear()
	_pila.add_child(Control.new())
	for i in Maderas.ORDEN_CORTES.size():
		var cab := HBoxContainer.new()
		cab.alignment = BoxContainer.ALIGNMENT_CENTER
		cab.add_theme_constant_override("separation", 4)
		cab.add_child(Tema.etiqueta(Maderas.CORTES[Maderas.ORDEN_CORTES[i]].nombre, 12, Tema.TENUE))
		cab.add_child(Tema.tecla(str(i + 1)))
		_pila.add_child(cab)
	for sp: String in filas:
		_pila.add_child(_nombre_fila(sp))
		for corte: String in Maderas.ORDEN_CORTES:
			if sp == "pina" and corte != "rama":
				_pila.add_child(Control.new())
				continue
			var clave := "pina" if sp == "pina" else Maderas.clave(sp, corte)
			var w := Maderas.de(clave)
			var b := Tema.boton("0", elegir_madera.bind(clave))
			b.custom_minimum_size = Vector2(64, 30)
			b.add_theme_font_size_override("font_size", 15)
			b.add_theme_font_override("font", Tema.fuente_fuerte())
			b.tooltip_text = "%s\n%s\n🔥 Calor %.1f · ⏱ arde ~%d s\n%s" % [w.nombre, w.desc, w.calor, roundi(w.combustible), w.pista]
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
	if not Herramientas.de(id).get("sopla", false) and not Herramientas.de(id).get("limpia", false):
		juego.estado.d.herramienta = id
	sonar.emit("click")
	mano_cambia.emit(mano_tipo, mano_id)
	_refrescar_mano()


# El botón que tiene el objeto en la mano se ve dorado.
func _marcar(b: Button, elegido: bool) -> void:
	for k in ["normal", "hover", "pressed", "disabled"]:
		if elegido:
			b.add_theme_stylebox_override(k, _sel)
		else:
			b.remove_theme_stylebox_override(k)


func _refrescar_mano() -> void:
	for k: String in _celdas:
		_marcar(_celdas[k], mano_tipo == "madera" and mano_id == k)
	for id: String in _herramientas:
		_marcar(_herramientas[id], mano_tipo == "herramienta" and mano_id == id)


# --- Abajo al centro: la pista del momento y las herramientas ---

func _crear_abajo() -> void:
	var caja := VBoxContainer.new()
	caja.add_theme_constant_override("separation", 8)
	caja.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(caja)
	_pista = _pastilla_en(caja, 15, Tema.ORO)
	var fila := HBoxContainer.new()
	fila.add_theme_constant_override("separation", 6)
	fila.alignment = BoxContainer.ALIGNMENT_CENTER
	fila.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caja.add_child(fila)
	for h: Dictionary in Herramientas.TODAS:
		var b := _boton_herramienta(h)
		fila.add_child(b)
		_herramientas[h.id] = b
	_ancla(caja, Control.PRESET_CENTER_BOTTOM, Control.GROW_DIRECTION_BOTH, Control.GROW_DIRECTION_BEGIN)


func _boton_herramienta(h: Dictionary) -> Button:
	var b := Tema.boton("", elegir_herramienta.bind(h.id))
	b.custom_minimum_size = Vector2(104, 58)
	b.tooltip_text = h.desc
	var margen := MarginContainer.new()
	margen.set_anchors_preset(Control.PRESET_FULL_RECT)
	margen.add_theme_constant_override("margin_left", 8)
	margen.add_theme_constant_override("margin_right", 6)
	margen.add_theme_constant_override("margin_top", 4)
	margen.add_theme_constant_override("margin_bottom", 4)
	Tema.pasivo(margen)
	b.add_child(margen)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	Tema.pasivo(v)
	margen.add_child(v)
	var arriba := HBoxContainer.new()
	Tema.pasivo(arriba)
	v.add_child(arriba)
	var icono := Tema.etiqueta(h.icono, 21)
	icono.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	arriba.add_child(Tema.pasivo(icono))
	var tecla := Tema.tecla(OS.get_keycode_string(h.tecla))
	tecla.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	arriba.add_child(tecla)
	var nombre := Tema.etiqueta(h.nombre, 13, Tema.TEXTO, true)
	v.add_child(Tema.pasivo(nombre))
	_nombres_h[h.id] = nombre
	return b


# --- Abajo a la derecha: las ventanas del juego ---

func _crear_acciones() -> void:
	var caja := VBoxContainer.new()
	caja.add_theme_constant_override("separation", 6)
	caja.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(caja)
	for a: Dictionary in ACCIONES:
		var b := Tema.boton("", abrir.bind(a.id))
		b.custom_minimum_size = Vector2(210, 40)
		b.visible = false
		var margen := MarginContainer.new()
		margen.set_anchors_preset(Control.PRESET_FULL_RECT)
		margen.add_theme_constant_override("margin_left", 10)
		margen.add_theme_constant_override("margin_right", 8)
		Tema.pasivo(margen)
		b.add_child(margen)
		var fila := HBoxContainer.new()
		fila.add_theme_constant_override("separation", 8)
		Tema.pasivo(fila)
		margen.add_child(fila)
		var icono := Tema.etiqueta(a.icono, 18)
		icono.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		fila.add_child(Tema.pasivo(icono))
		var nombre := Tema.etiqueta(a.nombre, 14, Tema.TEXTO, true)
		nombre.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nombre.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		fila.add_child(Tema.pasivo(nombre))
		var insignia := Tema.pastilla("", Tema.ORO, 12)
		insignia.visible = false
		fila.add_child(insignia)
		_insignias[a.id] = insignia
		var tecla: Variant = VENTANAS_TECLA.find_key(a.id)
		if tecla != null:
			var cap := Tema.tecla(OS.get_keycode_string(int(tecla)))
			cap.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			fila.add_child(cap)
		caja.add_child(b)
		_acciones[a.id] = b
	_ancla(caja, Control.PRESET_BOTTOM_RIGHT, Control.GROW_DIRECTION_BEGIN, Control.GROW_DIRECTION_BEGIN)


# --- Ventanas ---

# Una capa que va sobre el mundo pero debajo del velo y las ventanas (por ejemplo, los rótulos).
func agregar_capa(c: Control) -> void:
	_raiz.add_child(c)
	_raiz.move_child(c, _aro.get_index())


func hay_ventana() -> bool:
	return _ventana != null


func abrir(nombre: String) -> void:
	_poner(_crear_ventana(nombre), nombre)
	_ventana.refrescar()
	sonar.emit("click")


# Deja `v` como la única ventana abierta: veló, pausa y fundido.
func _poner(v: Ventana, nombre: String) -> void:
	var ya_pausado := _ventana != null # cambiar de ventana no suma otra pausa
	if _ventana != null:
		_ventana.queue_free()
	_ventana = v
	_nombre_ventana = nombre
	v.cerrar.connect(cerrar)
	_velo.visible = true
	_velo.modulate.a = 0.0
	_velo.create_tween().tween_property(_velo, "modulate:a", 1.0, 0.15)
	_raiz.add_child(v)
	if not ya_pausado:
		juego.pausar(true)


func cerrar() -> void:
	if _ventana == null:
		return
	_ventana.queue_free()
	_ventana = null
	_nombre_ventana = ""
	_velo.visible = false
	juego.pausar(false)


func alternar_dev() -> void:
	if _nombre_ventana == "dev":
		cerrar()
	else:
		abrir("dev")


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
		"dev": return _ventana_dev()
	return _ventana_menu()


func _tienda(titulo: String, tab: String) -> VentanaTabla:
	return VentanaTabla.new(titulo, func(v: VentanaTabla) -> Array:
		var e := juego.estado
		var d: Dictionary = e.d
		v.poner_info("🔥 %s de calor para gastar" % Tema.numero(d.calor))
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
				fila["texto_boton"] = "✔ Listo"
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
		v.poner_info("🪦 %d de ceniza · %d amaneceres. Renacer reinicia la partida y conserva esto." % [meta.ash, e.d.night.dawns])
		var fuera := []
		for m: Dictionary in Cenizas.MEJORAS:
			var nivel := int(meta.upgrades.get(m.id, 0))
			var fila := {"icono": m.icono, "nombre": m.nombre, "desc": m.desc, "dato": "%d/%d" % [nivel, m.max]}
			if nivel >= m.max:
				fila["texto_boton"] = "✔ Listo"
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
	var al_renacer := func() -> void:
		cerrar()
		juego.renacer()
	var renacer := Tema.boton("Renacer (+%d)" % juego.estado.ceniza_posible(), al_renacer, "Principal")
	renacer.disabled = not juego.estado.puede_renacer()
	renacer.tooltip_text = "Hace falta sobrevivir una noche."
	ventana.poner_extra(renacer)
	return ventana


func _ventana_logros() -> VentanaTabla:
	var filas := func(_v: VentanaTabla) -> Array:
		var fuera := []
		for a: Dictionary in Logros.lista():
			var hecho: bool = juego.estado.d.meta.achievements.get(a.id, false)
			fuera.append({"icono": a.icono, "nombre": a.nombre, "desc": "%s (%s)" % [a.desc, a.premio], "texto_boton": "✔" if hecho else "", "pendiente": not hecho})
		return fuera
	return VentanaTabla.new("🏆 Logros", filas, Vector2(760, 540))


func _seccion(v: Ventana, texto: String) -> void:
	v.cuerpo.add_child(Tema.etiqueta(texto.to_upper(), 11, Tema.APAGADO, true))


func _ancho(b: Button) -> Button:
	b.custom_minimum_size.y = 38
	return b


func _ventana_menu() -> Ventana:
	var v := Ventana.new("⚙️ Menú", Vector2(440, 0))
	var aj: Dictionary = juego.estado.d.ajustes
	_seccion(v, "Sonido")
	var fila := HBoxContainer.new()
	fila.add_theme_constant_override("separation", 10)
	fila.add_child(Tema.etiqueta("🔊", 18))
	var vol := HSlider.new()
	vol.min_value = 0.0
	vol.max_value = 1.0
	vol.step = 0.05
	vol.value = aj.volumen
	vol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vol.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var cifra := Tema.etiqueta("%d%%" % roundi(aj.volumen * 100.0), 13, Tema.TENUE, true)
	cifra.custom_minimum_size.x = 40
	vol.value_changed.connect(func(x: float) -> void:
		aj.volumen = x
		cifra.text = "%d%%" % roundi(x * 100.0)
		sonidos.ajustes(aj.volumen, aj.mudo))
	fila.add_child(vol)
	fila.add_child(cifra)
	v.cuerpo.add_child(fila)
	var mudo := _ancho(Tema.boton("", func() -> void: pass))
	mudo.toggle_mode = true
	mudo.button_pressed = aj.mudo
	var rotular := func(x: bool) -> void:
		mudo.text = "🔇  Silenciado" if x else "🔊  Con sonido"
	rotular.call(aj.mudo)
	mudo.toggled.connect(func(x: bool) -> void:
		aj.mudo = x
		rotular.call(x)
		sonidos.ajustes(aj.volumen, aj.mudo))
	v.cuerpo.add_child(mudo)
	_seccion(v, "Pantalla")
	var destellos := _ancho(Tema.boton("", func() -> void: pass))
	destellos.toggle_mode = true
	destellos.button_pressed = aj.get("destellos", true)
	var rotular_d := func(x: bool) -> void:
		destellos.text = "✨  Destellos de pantalla: sí" if x else "✨  Destellos de pantalla: no"
	rotular_d.call(destellos.button_pressed)
	destellos.tooltip_text = "El fogonazo que ilumina la pantalla en los momentos grandes (pico, nivel, evolución)."
	destellos.toggled.connect(func(x: bool) -> void:
		aj["destellos"] = x
		rotular_d.call(x))
	v.cuerpo.add_child(destellos)
	v.cuerpo.add_child(HSeparator.new())
	_seccion(v, "Partida")
	v.cuerpo.add_child(_ancho(Tema.boton("🏆  Logros", func() -> void: abrir("logros"))))
	v.cuerpo.add_child(_ancho(Tema.boton("💾  Guardar y salir", func() -> void:
		juego.estado.guardar()
		get_tree().quit())))
	var nueva := _ancho(Tema.boton("Partida nueva…", func() -> void: pass))
	nueva.add_theme_color_override("font_color", Tema.MAL)
	nueva.pressed.connect(func() -> void:
		if nueva.text == "Partida nueva…":
			nueva.text = "¿Seguro? Se borra todo"
			return
		cerrar()
		juego.partida_nueva())
	v.cuerpo.add_child(nueva)
	v.cuerpo.add_child(HSeparator.new())
	var teclas := Tema.etiqueta("Teclas: 1 · 2 · 3 elegir corte · F P R G herramientas · S C H A ventanas · Esc menú", 12, Tema.APAGADO)
	teclas.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.cuerpo.add_child(teclas)
	return v


func _ventana_inicio() -> Ventana:
	var v := Ventana.new("🔥 Fogata Master", Vector2(400, 0), false)
	var hay := FileAccess.file_exists(Estado.ARCHIVO)
	var lema := Tema.etiqueta("Mantené el fuego vivo hasta que amanezca.", 14, Tema.TENUE)
	lema.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.cuerpo.add_child(lema)
	if hay:
		var seguir := _ancho(Tema.boton("Continuar", cerrar, "Principal"))
		v.cuerpo.add_child(seguir)
	var empezar := func() -> void:
		cerrar()
		if hay:
			juego.partida_nueva()
	v.cuerpo.add_child(_ancho(Tema.boton("Partida nueva" if hay else "Empezar", empezar, "" if hay else "Principal")))
	return v


# Botones para probar el juego sin jugarlo (datos/dev.gd). Queda abierta para tocar varios seguidos.
func _ventana_dev() -> Ventana:
	var v := Ventana.new("🛠 Dev", Vector2(640, 0))
	var nota := Tema.etiqueta("Solo para desarrollo: no va a estar en el juego final.", 12, Tema.APAGADO)
	v.cuerpo.add_child(nota)
	var grilla: GridContainer
	for a: Dictionary in Dev.acciones():
		if a.has("seccion"):
			_seccion(v, a.seccion)
			grilla = GridContainer.new()
			grilla.columns = 3
			grilla.add_theme_constant_override("h_separation", 6)
			grilla.add_theme_constant_override("v_separation", 6)
			v.cuerpo.add_child(grilla)
			continue
		var b := Tema.boton("%s  %s" % [a.icono, a.nombre], func() -> void: pass)
		b.custom_minimum_size = Vector2(200, 36)
		b.add_theme_font_size_override("font_size", 13)
		b.pressed.connect(func() -> void:
			a.accion.call(juego)
			juego.estado.recalcular()
			juego.estado.guardar()
			sonar.emit("compra")
			flotar(b.get_global_rect().get_center(), "✔", Tema.BIEN))
		grilla.add_child(b)
	return v


func mostrar_amanecer(info: Dictionary) -> void:
	var v := Ventana.new("🌅 Amaneció" if info.exito else "🥶 El frío ganó esta noche", Vector2(440, 0))
	if info.exito:
		v.cuerpo.add_child(Tema.etiqueta("+%d de ceniza" % info.ceniza, 20, Tema.BIEN, true))
	if info.punto:
		v.cuerpo.add_child(Tema.etiqueta("● +1 punto de habilidad por una buena noche", 15, Tema.ORO, true))
	v.cuerpo.add_child(Tema.etiqueta("Calor de la noche: %s" % Tema.numero(info.calor), 14))
	var en_meta := Tema.etiqueta("En meta: %d%% de la noche" % roundi(info.proporcion * 100.0), 13, Tema.TENUE)
	v.cuerpo.add_child(en_meta)
	var barra := Tema.barra(Tema.BIEN if info.exito else Tema.FRIO, 10)
	barra.value = clampf(info.proporcion, 0.0, 1.0)
	v.cuerpo.add_child(barra)
	v.cuerpo.add_child(_ancho(Tema.boton("Seguir", cerrar, "Principal")))
	_poner(v, "amanecer")


# Resumen al renacer (como el del 2D): lo que dejó la partida y lo que se lleva a la próxima.
func mostrar_renacer(info: Dictionary) -> void:
	var v := Ventana.new("🪦 Renaciste", Vector2(460, 0))
	v.cuerpo.add_child(Tema.etiqueta("+%d de ceniza" % info.ceniza, 24, Tema.BIEN, true))
	var minutos := int(info.tiempo / 60.0)
	var lineas := [
		"🔥 Calor juntado: %s" % Tema.numero(info.calor),
		"⭐ Llegaste al nivel %d" % info.nivel,
		"🌅 Noches sobrevividas: %d" % info.noches,
		"🔨 Tu mejor fogata: %s" % Fogones.de(info.fogones).nombre,
		"⏱ %d h %02d min de partida" % [minutos / 60, minutos % 60],
	]
	for t: String in lineas:
		v.cuerpo.add_child(Tema.etiqueta(t, 14))
	v.cuerpo.add_child(HSeparator.new())
	var nota := Tema.etiqueta("Tenés %d de ceniza para mejoras permanentes. Renacimiento n.º %d." % [info.ash, info.vez], 13, Tema.TENUE)
	nota.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.cuerpo.add_child(nota)
	var fila := HBoxContainer.new()
	fila.add_theme_constant_override("separation", 8)
	var gastar := _ancho(Tema.boton("🪦 Ver mejoras", func() -> void: abrir("cenizas"), "Principal"))
	gastar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	fila.add_child(gastar)
	var seguir := _ancho(Tema.boton("Empezar", cerrar))
	seguir.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	fila.add_child(seguir)
	v.cuerpo.add_child(fila)
	_poner(v, "renacer")


# --- Avisos y texto flotante ---

func avisar(texto: String, tipo := "") -> void:
	var color: Color = {"malo": Tema.MAL, "hito": Tema.ORO, "logro": Tema.BIEN}.get(tipo, Tema.TEXTO)
	var p := Tema.pastilla(texto, color, 15)
	p.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var l := Tema.texto_de(p)
	l.add_theme_font_override("font", ThemeDB.fallback_font)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = minf(520.0, ThemeDB.fallback_font.get_string_size(texto, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x + 4.0)
	_avisos.add_child(p)
	while _avisos.get_child_count() > 4:
		_avisos.get_child(0).free()
	p.modulate.a = 0.0
	var t := p.create_tween()
	t.tween_property(p, "modulate:a", 1.0, 0.18)
	t.tween_interval(4.5)
	t.tween_property(p, "modulate:a", 0.0, 0.6)
	t.tween_callback(p.queue_free)


func flotar(pos: Vector2, texto: String, color := Tema.TEXTO) -> void:
	var l := Tema.con_contorno(Tema.etiqueta(texto, 18, color, true))
	l.position = pos - Vector2(30, 10)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_raiz.add_child(l)
	var t := l.create_tween().set_parallel()
	t.tween_property(l, "position:y", pos.y - 56.0, 1.1).set_ease(Tween.EASE_OUT)
	t.tween_property(l, "modulate:a", 0.0, 1.1).set_delay(0.3)
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
	var calor: float = d.calor
	_calor.text = Tema.numero(calor)
	if calor - _calor_prev > maxf(2.0, e.ritmo * 0.6):
		Tema.golpe(_calor, 1.12)
	_calor_prev = calor
	_ritmo.text = "+%.1f /s" % e.ritmo
	var pts := Habilidades.puntos(d) if abierto.get("habilidades", false) else 0
	_nivel.text = "Nivel %d" % d.level
	if int(d.level) > _nivel_prev:
		if _nivel_prev > 0:
			Tema.golpe(_nivel, 1.3)
		_nivel_prev = int(d.level)
	_puntos.text = "● %d %s" % [pts, "punto" if pts == 1 else "puntos"]
	_ver(_puntos, pts > 0)
	_barra_nivel.value = Progreso.avance_nivel(d, e.mods.level_ease)
	var obj := e.proximo_objetivo()
	_objetivo.text = "" if obj.is_empty() else "%s %s" % [obj.icono, obj.texto]
	_objetivo_caja.visible = not obj.is_empty()

	var pron := juego.clima.pronostico()
	_ver(_pronostico, not pron.is_empty())
	if not pron.is_empty():
		var info: Dictionary = Clima.INFO[pron.tipo]
		_pronostico.text = "%s %s %s %ds" % [info.icono, info.nombre, "en" if pron.fase == "aviso" else "por", ceili(pron.reloj)]
	var ni := e.info_noche()
	var hay_noche: bool = ni.fase != "off"
	_ver(_noche, hay_noche)
	_barra_frio.visible = ni.fase == "night"
	if hay_noche:
		match ni.fase:
			"day": _noche.text = "☀️ Día %d · la tarde cae en %ds" % [ni.n, ceili(ni.resta)]
			"dusk": _noche.text = "🌇 Atardecer · la noche %d pide %.1f/s" % [ni.n, ni.meta]
			"night": _noche.text = "🌙 Noche %d · pide %.1f/s · tenés %.1f/s · %ds" % [ni.n, ni.meta, e.ritmo, ceili(ni.resta)]
		_barra_frio.value = d.night.cold
		Tema.color_barra(_barra_frio, Tema.FRIO.lerp(Tema.MAL, clampf(d.night.cold, 0.0, 1.0)))

	_avisos.visible = not hay_ventana()
	_pista.text = _pista_actual()
	_ver(_pista, not _pista.text.is_empty() and not hay_ventana())

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
	_aro.radio = Chispas.ATRAE_PX * e.mods.orb_pull if not hay_ventana() else 0.0
	var fosforos := int(d.res.get("fosforo", 0))
	(_nombres_h.fosforo as Label).text = "Fósforo ×%d" % fosforos
	(_nombres_h.fosforo as Label).add_theme_color_override("font_color", Tema.TEXTO if fosforos > 0 else Tema.MAL)
	for id: String in _herramientas:
		_herramientas[id].visible = Herramientas.disponible(d, Herramientas.de(id))

	_acciones.pyroshop.visible = abierto.get("tienda", false)
	_acciones.construir.visible = abierto.get("construir", false)
	_acciones.arbol.visible = abierto.get("habilidades", false)
	_acciones.cenizas.visible = abierto.get("noches", false) or d.meta.totalDawns >= 1 or d.meta.prestiges >= 1
	var insignia: PanelContainer = _insignias.arbol
	insignia.visible = pts > 0
	Tema.texto_de(insignia).text = "● %d" % pts
	var ayuda := []
	for s: Dictionary in Proveedores.lista():
		if s.has("etiqueta") and s.nivel.call(d) > 0:
			ayuda.append(s.etiqueta)
	_ayudantes.text = "  ".join(ayuda)
	_ver(_ayudantes, not ayuda.is_empty())


func _pista_actual() -> String:
	var e := juego.estado
	var d: Dictionary = e.d
	var fuego := juego.fuego
	var paso := _paso_tutorial()
	if not paso.is_empty():
		return paso
	if fuego.apagado():
		var hay_cruda := fuego.pozos.any(func(p: Pozo) -> bool: return not p.lenos.is_empty())
		if not hay_cruda:
			return "Se apagó. Elegí ramas en la pila y soltalas en el pozo."
		return "Elegí el pedernal (P) o un fósforo abajo y tocá la leña para prenderla."
	if d.playTime < 25.0 and d.totalCalor < 15.0:
		return "Elegí leña en la pila y hacé clic en el pozo para soltarla."
	if fuego.llamas == 0 and fuego.brasas > 0:
		return "Quedan brasas… poné ramas, que prenden con poco."
	if e.madera_total() == 0 and d.unlocked.get("tienda", false):
		return "No te queda leña: comprá en Pyroshop (S)."
	if d.unlocked.get("rastrillo", false) and fuego.pozos.any(func(p: Pozo) -> bool: return p.ceniza >= CENIZA_PIDE_RASTRILLO):
		return "La ceniza ahoga el fuego: elegí el rastrillo (R) y tocá la fogata."
	if d.playTime < 240.0 and d.totalCalor >= 15.0:
		return "Cámara: arrastrá el suelo o clic derecho para girar · rueda para el zoom."
	return ""


# El paso del tutorial que toca ahora (datos/tutorial.gd), o "" si ya terminó.
# Si el fuego se apaga a mitad de camino, las pistas comunes ayudan a prenderlo de nuevo.
func _paso_tutorial() -> String:
	var d: Dictionary = juego.estado.d
	var pasos := Tutorial.pasos()
	var i := int(d.tuto)
	if i >= pasos.size():
		return ""
	while i < pasos.size() and pasos[i].hecho.call(juego, mano_id):
		i += 1
	if i != int(d.tuto):
		d.tuto = i
		sonar.emit("hito")
		if i >= pasos.size():
			avisar("🔥 ¡Tu primer fuego! Mantenelo vivo: el calor que da es tu moneda.", "hito")
			return ""
	if i >= 2 and not juego.hay_fuego():
		return ""
	return pasos[i].texto
