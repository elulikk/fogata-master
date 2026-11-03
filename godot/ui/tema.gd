class_name Tema
# Estilo de toda la interfaz y ayudas para armarla por código.

const FONDO := Color(0.1, 0.063, 0.035, 0.94)
const BORDE := Color(0.6, 0.36, 0.16)
const TEXTO := Color(0.95, 0.9, 0.83)
const TENUE := Color(0.72, 0.62, 0.5)
const CALOR := Color(1.0, 0.62, 0.2)
const BIEN := Color(0.75, 0.9, 0.55)
const MAL := Color(1.0, 0.6, 0.5)


static func _caja(fondo: Color, borde: Color, ancho := 1) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = fondo
	s.border_color = borde
	s.set_border_width_all(ancho)
	s.set_corner_radius_all(5)
	s.content_margin_left = 8.0
	s.content_margin_right = 8.0
	s.content_margin_top = 3.0
	s.content_margin_bottom = 3.0
	return s


static func crear() -> Theme:
	var t := Theme.new()
	t.default_font_size = 14
	t.set_color("font_color", "Label", TEXTO)
	t.set_stylebox("panel", "PanelContainer", _caja(FONDO, BORDE))
	t.set_stylebox("panel", "Panel", _caja(FONDO, BORDE))
	t.set_stylebox("normal", "Button", _caja(Color(0.2, 0.13, 0.08), Color(0.42, 0.27, 0.14)))
	t.set_stylebox("hover", "Button", _caja(Color(0.32, 0.2, 0.1), CALOR))
	t.set_stylebox("pressed", "Button", _caja(Color(0.45, 0.27, 0.1), CALOR, 2))
	t.set_stylebox("disabled", "Button", _caja(Color(0.13, 0.1, 0.08), Color(0.25, 0.19, 0.14)))
	t.set_stylebox("focus", "Button", StyleBoxEmpty.new())
	t.set_color("font_color", "Button", TEXTO)
	t.set_color("font_disabled_color", "Button", Color(0.55, 0.48, 0.4))
	return t


static func etiqueta(texto := "", tam := 14, color := TEXTO) -> Label:
	var l := Label.new()
	l.text = texto
	l.add_theme_font_size_override("font_size", tam)
	l.add_theme_color_override("font_color", color)
	return l


static func con_contorno(l: Label) -> Label:
	l.add_theme_constant_override("outline_size", 5)
	l.add_theme_color_override("font_outline_color", Color.BLACK)
	return l


static func boton(texto: String, al_tocar: Callable) -> Button:
	var b := Button.new()
	b.text = texto
	b.focus_mode = Control.FOCUS_NONE
	b.pressed.connect(al_tocar)
	return b


static func numero(n: float) -> String:
	var a := absf(n)
	if a >= 1000000.0:
		return "%.2fM" % (n / 1000000.0)
	if a >= 10000.0:
		return "%.1fk" % (n / 1000.0)
	return str(int(n))
