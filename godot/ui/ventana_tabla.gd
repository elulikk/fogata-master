class_name VentanaTabla
extends Ventana
# Ventana de lista con una tarjeta por fila. Sirve para Pyroshop, Construir, Cenizas y Logros.
# `filas` recibe la ventana y devuelve una lista de {icono, nombre, desc, dato, precio, puede, texto_boton, accion, pendiente};
# sin accion no hay botón: texto_boton se muestra como sello. Si puede es verdadero la fila se resalta.

const ALTO_ICONO := 38
const ANCHO_BOTON := 100
const ALTO_MAXIMO := 470.0

var filas: Callable
var _lista: VBoxContainer
var _info: Label
var _info_caja: PanelContainer
var _scroll: ScrollContainer


func _init(titulo: String, proveedor: Callable, tam := Vector2(860, 0)) -> void:
	super(titulo, tam)
	filas = proveedor
	_info_caja = PanelContainer.new()
	_info_caja.theme_type_variation = "Tarjeta"
	_info_caja.visible = false
	_info = Tema.etiqueta("", 15, Tema.CALOR, true)
	_info_caja.add_child(_info)
	cuerpo.add_child(_info_caja)
	_scroll = ScrollContainer.new()
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	cuerpo.add_child(_scroll)
	_lista = VBoxContainer.new()
	_lista.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_lista.add_theme_constant_override("separation", 6)
	_scroll.add_child(_lista)


func poner_info(t: String) -> void:
	_info.text = t
	_info_caja.visible = not t.is_empty()


func _icono(texto: String) -> Control:
	var c := PanelContainer.new()
	c.add_theme_stylebox_override("panel", Tema.caja(Color(0, 0, 0, 0.35), Tema.BORDE_SUAVE, 1, 8, 0.0, 0.0))
	c.custom_minimum_size = Vector2(ALTO_ICONO, ALTO_ICONO)
	var l := Tema.etiqueta(texto, 21)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	c.add_child(l)
	return c


func _fila(datos: Dictionary) -> Control:
	var puede: bool = datos.has("accion") and datos.get("puede", true)
	var tarjeta := PanelContainer.new()
	tarjeta.theme_type_variation = "Destacada" if puede else "Tarjeta"
	if datos.get("pendiente", false):
		tarjeta.modulate = Color(1, 1, 1, 0.55)
	var f := HBoxContainer.new()
	f.add_theme_constant_override("separation", 10)
	tarjeta.add_child(f)
	f.add_child(_icono(datos.get("icono", "")))

	var texto := VBoxContainer.new()
	texto.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	texto.alignment = BoxContainer.ALIGNMENT_CENTER
	texto.add_theme_constant_override("separation", 0)
	texto.add_child(Tema.etiqueta(datos.nombre, 15, Tema.TEXTO, true))
	var d := Tema.etiqueta(datos.get("desc", ""), 12, Tema.TENUE)
	d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	d.tooltip_text = datos.get("desc", "")
	d.mouse_filter = Control.MOUSE_FILTER_PASS
	texto.add_child(d)
	f.add_child(texto)

	if datos.has("dato"):
		var n := Tema.etiqueta(datos.dato, 15, Tema.TEXTO, true)
		n.custom_minimum_size.x = 54
		n.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		n.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		n.tooltip_text = "Lo que tenés"
		n.mouse_filter = Control.MOUSE_FILTER_PASS
		f.add_child(n)

	if datos.has("accion"):
		var rotulo: String = datos.get("precio", datos.get("texto_boton", "Comprar"))
		var b := Tema.boton(rotulo, datos.accion, "Principal" if puede else "")
		b.custom_minimum_size = Vector2(ANCHO_BOTON, 34)
		b.add_theme_font_size_override("font_size", 14)
		b.disabled = not puede
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		f.add_child(b)
	else:
		var sello := Tema.etiqueta(datos.get("texto_boton", ""), 14, Tema.BIEN, true)
		sello.custom_minimum_size.x = ANCHO_BOTON if sello.text.length() > 1 else 34
		sello.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		sello.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		f.add_child(sello)
	return tarjeta


func refrescar() -> void:
	var antes := _scroll.scroll_vertical
	for h in _lista.get_children():
		_lista.remove_child(h)
		h.queue_free()
	var datos_filas: Array = filas.call(self)
	for datos: Dictionary in datos_filas:
		_lista.add_child(_fila(datos))
	if datos_filas.is_empty():
		var vacio := Tema.etiqueta("Todavía no hay nada acá.", 14, Tema.TENUE)
		vacio.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_lista.add_child(vacio)
	_ajustar.call_deferred(antes)


# La ventana se ajusta al contenido hasta un tope; pasado eso, la lista se desplaza.
func _ajustar(scroll_antes: int) -> void:
	if not is_inside_tree():
		return
	_scroll.custom_minimum_size.y = clampf(_lista.get_combined_minimum_size().y + 4.0, 70.0, ALTO_MAXIMO)
	_scroll.scroll_vertical = scroll_antes
