class_name Tema
# Estilo de toda la interfaz y ayudas para armarla por código.
# Paleta de noche junto al fuego: fondos carbón, acento brasa, texto crema.
# Variaciones de tipo (theme_type_variation): Principal y Plano (Button), Hud, Tarjeta, Destacada y Pastilla (PanelContainer).

const FONDO := Color(0.075, 0.05, 0.04, 0.95)
const FONDO_HUD := Color(0.06, 0.04, 0.03, 0.72)
const FONDO_2 := Color(0.14, 0.095, 0.068, 0.95)
const FONDO_3 := Color(0.21, 0.145, 0.1, 1.0)
const BORDE := Color(0.45, 0.29, 0.16)
const BORDE_SUAVE := Color(0.27, 0.18, 0.115)
const TEXTO := Color(0.96, 0.92, 0.85)
const TENUE := Color(0.7, 0.6, 0.5)
const APAGADO := Color(0.48, 0.41, 0.34)
const CALOR := Color(1.0, 0.62, 0.2)
const ORO := Color(1.0, 0.82, 0.4)
const BIEN := Color(0.75, 0.9, 0.55)
const MAL := Color(1.0, 0.6, 0.5)
const FRIO := Color(0.45, 0.7, 1.0)
const TRANSPARENTE := Color(0, 0, 0, 0)

static var _negrita: FontVariation
static var _circulo: ImageTexture


static func fuente_fuerte() -> FontVariation:
	if _negrita == null:
		_negrita = FontVariation.new()
		_negrita.base_font = ThemeDB.fallback_font
		_negrita.variation_embolden = 0.55
	return _negrita


static func caja(fondo: Color, borde := TRANSPARENTE, ancho := 1, radio := 8, mx := 10.0, my := 5.0, sombra := 0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = fondo
	s.border_color = borde
	s.set_border_width_all(ancho if borde.a > 0.0 else 0)
	s.set_corner_radius_all(radio)
	s.content_margin_left = mx
	s.content_margin_right = mx
	s.content_margin_top = my
	s.content_margin_bottom = my
	s.anti_aliasing = true
	if sombra > 0:
		s.shadow_color = Color(0, 0, 0, 0.45)
		s.shadow_size = sombra
		s.shadow_offset = Vector2(0, 3)
	return s


# Un punto redondo para el agarre de los deslizadores.
static func _punto(color: Color) -> ImageTexture:
	var img := Image.create(20, 20, false, Image.FORMAT_RGBA8)
	for y in 20:
		for x in 20:
			var dist := Vector2(x + 0.5, y + 0.5).distance_to(Vector2(10, 10))
			var a := clampf(9.5 - dist, 0.0, 1.0)
			var c := color if dist < 7.0 else Color(0.2, 0.1, 0.03)
			img.set_pixel(x, y, Color(c.r, c.g, c.b, a))
	return ImageTexture.create_from_image(img)


static func _boton(t: Theme, tipo: String, normal: StyleBoxFlat, hover: StyleBoxFlat, pulsado: StyleBoxFlat, apagado: StyleBoxFlat, color: Color, color_apagado: Color) -> void:
	t.set_stylebox("normal", tipo, normal)
	t.set_stylebox("hover", tipo, hover)
	t.set_stylebox("pressed", tipo, pulsado)
	t.set_stylebox("disabled", tipo, apagado)
	t.set_stylebox("focus", tipo, StyleBoxEmpty.new())
	t.set_color("font_color", tipo, color)
	t.set_color("font_hover_color", tipo, Color.WHITE)
	t.set_color("font_pressed_color", tipo, Color.WHITE)
	t.set_color("font_disabled_color", tipo, color_apagado)


static func crear() -> Theme:
	var t := Theme.new()
	t.default_font_size = 14
	t.set_color("font_color", "Label", TEXTO)

	# Paneles y sus variaciones.
	t.set_stylebox("panel", "PanelContainer", caja(FONDO, BORDE, 1, 12, 16.0, 12.0, 14))
	t.set_stylebox("panel", "Panel", caja(FONDO, BORDE, 1, 12))
	t.set_type_variation("Hud", "PanelContainer")
	t.set_stylebox("panel", "Hud", caja(FONDO_HUD, BORDE_SUAVE, 1, 12, 12.0, 8.0))
	t.set_type_variation("Tarjeta", "PanelContainer")
	t.set_stylebox("panel", "Tarjeta", caja(FONDO_2, BORDE_SUAVE, 1, 9, 10.0, 6.0))
	t.set_type_variation("Destacada", "PanelContainer")
	t.set_stylebox("panel", "Destacada", caja(Color(0.2, 0.125, 0.07, 0.97), Color(CALOR, 0.55), 1, 9, 10.0, 6.0))
	t.set_type_variation("Pastilla", "PanelContainer")
	t.set_stylebox("panel", "Pastilla", caja(Color(0.04, 0.03, 0.02, 0.7), Color(BORDE_SUAVE, 0.8), 1, 99, 12.0, 3.0))

	# Botones: normal, principal (brasa) y plano.
	_boton(t, "Button",
		caja(FONDO_2, BORDE_SUAVE, 1, 8, 10.0, 5.0),
		caja(FONDO_3, CALOR, 1, 8, 10.0, 5.0),
		caja(Color(0.34, 0.2, 0.09), CALOR, 2, 8, 10.0, 5.0),
		caja(Color(0.1, 0.075, 0.06, 0.85), Color(0.2, 0.15, 0.11), 1, 8, 10.0, 5.0), TEXTO, APAGADO)
	t.set_type_variation("Principal", "Button")
	_boton(t, "Principal",
		caja(Color(0.75, 0.36, 0.1), Color(1.0, 0.62, 0.25), 1, 8, 12.0, 5.0),
		caja(Color(0.92, 0.48, 0.14), Color(1.0, 0.8, 0.5), 1, 8, 12.0, 5.0),
		caja(Color(0.6, 0.28, 0.07), Color(1.0, 0.8, 0.5), 2, 8, 12.0, 5.0),
		caja(Color(0.15, 0.11, 0.085, 0.9), Color(0.24, 0.18, 0.13), 1, 8, 12.0, 5.0), Color(1.0, 0.96, 0.9), APAGADO)
	t.set_type_variation("Plano", "Button")
	_boton(t, "Plano",
		caja(TRANSPARENTE, TRANSPARENTE, 0, 8, 8.0, 4.0),
		caja(Color(1, 1, 1, 0.1), TRANSPARENTE, 0, 8, 8.0, 4.0),
		caja(Color(1, 1, 1, 0.18), TRANSPARENTE, 0, 8, 8.0, 4.0),
		caja(TRANSPARENTE, TRANSPARENTE, 0, 8, 8.0, 4.0), TENUE, APAGADO)

	# Ayudas emergentes.
	t.set_stylebox("panel", "TooltipPanel", caja(Color(0.05, 0.035, 0.025, 0.97), BORDE, 1, 8, 10.0, 7.0, 8))
	t.set_color("font_color", "TooltipLabel", TEXTO)
	t.set_font_size("font_size", "TooltipLabel", 13)

	# Deslizador, barra de desplazamiento, casilla y separador.
	t.set_stylebox("slider", "HSlider", caja(Color(0, 0, 0, 0.55), BORDE_SUAVE, 1, 4, 0.0, 3.0))
	t.set_stylebox("grabber_area", "HSlider", caja(Color(0.85, 0.42, 0.12), TRANSPARENTE, 0, 4, 0.0, 3.0))
	t.set_stylebox("grabber_area_highlight", "HSlider", caja(CALOR, TRANSPARENTE, 0, 4, 0.0, 3.0))
	if _circulo == null:
		_circulo = _punto(CALOR)
	t.set_icon("grabber", "HSlider", _circulo)
	t.set_icon("grabber_highlight", "HSlider", _circulo)
	t.set_icon("grabber_disabled", "HSlider", _circulo)
	t.set_stylebox("scroll", "VScrollBar", caja(Color(0, 0, 0, 0.3), TRANSPARENTE, 0, 4, 3.0, 0.0))
	t.set_stylebox("grabber", "VScrollBar", caja(BORDE, TRANSPARENTE, 0, 4, 3.0, 0.0))
	t.set_stylebox("grabber_highlight", "VScrollBar", caja(CALOR, TRANSPARENTE, 0, 4, 3.0, 0.0))
	t.set_stylebox("grabber_pressed", "VScrollBar", caja(CALOR, TRANSPARENTE, 0, 4, 3.0, 0.0))
	var linea := StyleBoxLine.new()
	linea.color = BORDE_SUAVE
	linea.thickness = 1
	t.set_stylebox("separator", "HSeparator", linea)
	t.set_constant("separation", "HSeparator", 8)
	return t


# --- Piezas sueltas ---

static func etiqueta(texto := "", tam := 14, color := TEXTO, fuerte := false) -> Label:
	var l := Label.new()
	l.text = texto
	l.add_theme_font_size_override("font_size", tam)
	l.add_theme_color_override("font_color", color)
	if fuerte:
		l.add_theme_font_override("font", fuente_fuerte())
	return l


static func con_contorno(l: Label) -> Label:
	l.add_theme_constant_override("outline_size", 5)
	l.add_theme_color_override("font_outline_color", Color.BLACK)
	return l


static func boton(texto: String, al_tocar: Callable, variacion := "") -> Button:
	var b := Button.new()
	b.text = texto
	b.focus_mode = Control.FOCUS_NONE
	b.pressed.connect(al_tocar)
	if not variacion.is_empty():
		b.theme_type_variation = variacion
	return b


# Contenedor sin interacción: sirve para armar el interior de un botón sin que robe los clics.
static func pasivo(c: Control) -> Control:
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


# Capuchón de tecla: la letra que activa algo.
static func tecla(texto: String) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", caja(Color(0, 0, 0, 0.45), BORDE_SUAVE, 1, 4, 5.0, 0.0))
	p.add_child(pasivo(etiqueta(texto, 11, TENUE, true)))
	pasivo(p)
	return p


# Pastilla con un texto corto de color (contadores, avisos de puntos).
static func pastilla(texto: String, color := CALOR, tam := 13) -> PanelContainer:
	var p := PanelContainer.new()
	p.theme_type_variation = "Pastilla"
	p.add_child(pasivo(etiqueta(texto, tam, color, true)))
	pasivo(p)
	return p


static func texto_de(p: PanelContainer) -> Label:
	return p.get_child(0) as Label


static func barra(color: Color, alto := 10) -> ProgressBar:
	var b := ProgressBar.new()
	b.show_percentage = false
	b.custom_minimum_size.y = alto
	b.max_value = 1.0
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_theme_stylebox_override("background", caja(Color(0, 0, 0, 0.55), BORDE_SUAVE, 1, alto / 2, 0.0, 0.0))
	b.add_theme_stylebox_override("fill", caja(color, TRANSPARENTE, 0, alto / 2, 0.0, 0.0))
	return b


static func color_barra(b: ProgressBar, color: Color) -> void:
	var s: StyleBoxFlat = b.get_theme_stylebox("fill") as StyleBoxFlat
	if s != null:
		s.bg_color = color


# Un pequeño golpe de escala para llamar la atención sobre un número.
static func golpe(c: Control, fuerza := 1.18) -> void:
	c.pivot_offset = c.size * 0.5
	var t := c.create_tween()
	t.tween_property(c, "scale", Vector2.ONE * fuerza, 0.09).set_ease(Tween.EASE_OUT)
	t.tween_property(c, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


static func numero(n: float) -> String:
	var a := absf(n)
	if a >= 1000000.0:
		return "%.2fM" % (n / 1000000.0)
	if a >= 10000.0:
		return "%.1fk" % (n / 1000.0)
	return str(int(n))
