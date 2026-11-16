class_name Rotulos
extends Control
# Lo que va en pantalla pegado al mundo 3D (viene del juego 2D):
#   - el cartel de cupos al pie de cada fogata mientras tenés leña en la mano,
#   - el anillo que se llena cuando el fuego se sostiene a pleno, hasta el pico,
#   - un solo mensaje a la vez sobre la fogata, con prioridad,
#   - el fogonazo: un destello de pantalla para los momentos grandes.
# Prioridades de los mensajes: 3 pico o urgencia · 2 nivel, evolución o fogata armada · 1 avisos chicos.
# Uno de menor prioridad se descarta mientras el de mayor siga vigente; uno igual o mayor lo reemplaza.

const ALTO_MENSAJE := 0.8 # metros sobre el pozo
const TECHO_PX := 165.0 # el mensaje no sube más que esto, para no pisar los avisos de arriba
const ALTO_ANILLO := 0.75
const RADIO_ANILLO := 24.0
const CERCA_PX := 170.0 # el cartel se ve entero con el cursor a esta distancia del pozo
const ICONO_CORTE := {"rama": "🌿", "lena": "🪵", "tronco": "🌳"}

var juego: Juego
var camara: Camera3D
var ui: Ui
var sonidos: Sonidos

var _carteles := {} # Pozo -> {caja, nombre, cortes: {corte: Label}}
var _mensaje: Label
var _msg_prio := 0
var _msg_hasta := 0.0
var _msg_ancla := Vector3.ZERO
var _msg_sube := 0.0
var _flash: ColorRect
var _tic := 0.0


func _init(j: Juego, c: Camera3D, u: Ui, s: Sonidos) -> void:
	juego = j
	camara = c
	ui = u
	sonidos = s
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _ready() -> void:
	_flash = ColorRect.new()
	_flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_flash.color = Color(1, 1, 1, 0)
	add_child(_flash)


func _ahora() -> float:
	return Time.get_ticks_msec() / 1000.0


func _en_pantalla(p: Vector3) -> Variant:
	if camara.is_position_behind(p):
		return null
	return camara.unproject_position(p)


# --- Mensaje sobre la fogata ---

func mensaje(donde: Vector3, texto: String, color := Tema.TEXTO, prio := 1, vida := 1.9, tam := 22) -> void:
	var ahora := _ahora()
	if _mensaje != null and is_instance_valid(_mensaje):
		if prio < _msg_prio and ahora < _msg_hasta:
			return
		_mensaje.queue_free()
	var l := Tema.con_contorno(Tema.etiqueta(texto, tam, color, true))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_constant_override("outline_size", 8)
	l.add_theme_constant_override("line_spacing", 2)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(l)
	move_child(l, 0)
	_mensaje = l
	_msg_prio = prio
	_msg_hasta = ahora + vida * 0.8
	_msg_ancla = donde
	_msg_sube = 0.0
	l.modulate.a = 0.0
	l.scale = Vector2.ONE * 0.7
	var t := l.create_tween().set_parallel()
	t.tween_property(l, "modulate:a", 1.0, 0.12)
	t.tween_property(l, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.tween_property(self, "_msg_sube", 20.0, vida).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	t.tween_property(l, "modulate:a", 0.0, vida * 0.35).set_delay(vida * 0.65)
	t.chain().tween_callback(l.queue_free)


func mensaje_pozo(p: Pozo, texto: String, color := Tema.TEXTO, prio := 1, vida := 1.9, tam := 22) -> void:
	mensaje(p.centro + Vector3.UP * (ALTO_MENSAJE + p.spec().radio * 0.4), texto, color, prio, vida, tam)


func fogonazo(color: Color, fuerza := 0.35, dura := 0.35) -> void:
	if not juego.estado.d.ajustes.get("destellos", true):
		return
	_flash.color = Color(color.r, color.g, color.b, fuerza)
	var t := _flash.create_tween()
	t.tween_property(_flash, "color:a", 0.0, dura).set_ease(Tween.EASE_OUT)


# --- Carteles de cupo ---

func _cartel(p: Pozo) -> Dictionary:
	if _carteles.has(p):
		return _carteles[p]
	var caja := PanelContainer.new()
	caja.theme_type_variation = "Hud"
	caja.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fila := HBoxContainer.new()
	fila.add_theme_constant_override("separation", 8)
	fila.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caja.add_child(fila)
	var nombre := Tema.etiqueta("", 12, Tema.TENUE, true)
	fila.add_child(nombre)
	var cortes := {}
	for corte: String in Maderas.ORDEN_CORTES:
		var l := Tema.etiqueta("", 13, Tema.TEXTO, true)
		fila.add_child(l)
		cortes[corte] = l
	add_child(caja)
	move_child(caja, 0)
	_carteles[p] = {"caja": caja, "nombre": nombre, "cortes": cortes}
	return _carteles[p]


func _carteles_tick() -> void:
	var pozos := juego.fuego.pozos
	for p: Pozo in _carteles.keys():
		if not pozos.has(p):
			_carteles[p].caja.queue_free()
			_carteles.erase(p)
	var corte_mano := ""
	if ui.mano_tipo == "madera" and Maderas.es_madera(ui.mano_id):
		corte_mano = Maderas.de(ui.mano_id).corte
	var raton := get_viewport().get_mouse_position()
	var m: Dictionary = juego.estado.mods
	for p: Pozo in pozos:
		var c := _cartel(p)
		var caja: PanelContainer = c.caja
		var en: Variant = _en_pantalla(p.centro + Vector3(0.0, 0.0, p.spec().radio + 0.25))
		caja.visible = en != null and not corte_mano.is_empty() and not ui.hay_ventana()
		if not caja.visible:
			continue
		(c.nombre as Label).text = p.spec().nombre if pozos.size() == 1 else "%s %d" % [p.spec().nombre, p.indice + 1]
		for corte: String in Maderas.ORDEN_CORTES:
			var l: Label = c.cortes[corte]
			var cupo := p.cupo(corte, m)
			l.visible = cupo > 0
			if cupo == 0:
				continue
			var hay := p.cuantos(corte)
			l.text = "%s %d/%d" % [ICONO_CORTE[corte], hay, cupo]
			var color := Tema.TEXTO
			if hay >= cupo:
				color = Tema.MAL if corte == corte_mano else Tema.APAGADO
			elif corte == corte_mano:
				color = Tema.ORO
			l.add_theme_color_override("font_color", color)
		caja.reset_size()
		caja.position = (en as Vector2) - Vector2(caja.size.x * 0.5, 0.0)
		var cerca: float = clampf(1.0 - ((en as Vector2) - raton).length() / (CERCA_PX * 2.0), 0.0, 1.0)
		caja.modulate.a = 0.55 + 0.45 * cerca


# --- Anillo del pico ---

func _anillo_tick(dt: float) -> void:
	var fuego := juego.fuego
	var mejor := 0.0
	if fuego.pico_espera <= 0.0:
		for p: Pozo in fuego.pozos:
			mejor = maxf(mejor, p.pico_t / Fuego.PICO.dura)
	if mejor > 0.05 and juego.pausado == 0:
		_tic -= dt
		if _tic <= 0.0:
			_tic = 0.55 - 0.3 * mejor
			sonidos.tocar("tic", 0.5 + 0.5 * mejor, 1.0 + mejor * 0.6, 40)
	else:
		_tic = 0.0


func _draw() -> void:
	var fuego := juego.fuego
	if fuego.pico_espera > 0.0 or ui.hay_ventana():
		return
	var latido := 0.5 + 0.5 * sin(_ahora() * 9.0)
	for p: Pozo in fuego.pozos:
		var avance: float = clampf(p.pico_t / Fuego.PICO.dura, 0.0, 1.0)
		if avance <= 0.02:
			continue
		var en: Variant = _en_pantalla(p.centro + Vector3.UP * (ALTO_ANILLO + p.spec().radio * 0.3))
		if en == null:
			continue
		var c: Vector2 = en
		var r := RADIO_ANILLO * (1.0 + 0.08 * latido * avance)
		var color := Tema.CALOR.lerp(Tema.ORO, avance)
		draw_arc(c, r, 0.0, TAU, 48, Color(0, 0, 0, 0.45), 7.0, true)
		draw_arc(c, r, -PI * 0.5, -PI * 0.5 + TAU * avance, 48, Color(color, 0.95), 5.0, true)
		draw_arc(c, r + 5.0, -PI * 0.5, -PI * 0.5 + TAU * avance, 48, Color(color, 0.18 + 0.2 * latido), 4.0, true)
		var fuente := ThemeDB.fallback_font
		draw_string(fuente, c + Vector2(-9, 7), "🔥", HORIZONTAL_ALIGNMENT_LEFT, -1, 18)
		if avance > 0.25:
			var texto := "¡Sostenelo!"
			var ancho := fuente.get_string_size(texto, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
			draw_string_outline(fuente, c + Vector2(-ancho * 0.5, r + 22.0), texto, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, 5, Color(0, 0, 0, 0.8))
			draw_string(fuente, c + Vector2(-ancho * 0.5, r + 22.0), texto, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(Tema.ORO, 0.7 + 0.3 * latido))


func _process(delta: float) -> void:
	_carteles_tick()
	_anillo_tick(delta)
	if _mensaje != null and is_instance_valid(_mensaje):
		var en: Variant = _en_pantalla(_msg_ancla)
		_mensaje.visible = en != null and not ui.hay_ventana()
		if en != null:
			_mensaje.reset_size()
			_mensaje.pivot_offset = _mensaje.size * 0.5
			var pos := (en as Vector2) - _mensaje.size * 0.5 - Vector2(0.0, _msg_sube)
			pos.y = maxf(pos.y, TECHO_PX)
			_mensaje.position = pos
	queue_redraw()
