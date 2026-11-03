class_name VentanaTabla
extends Ventana
# Ventana con tabla de filas bajas. Sirve para Pyroshop, Construir, Cenizas y Logros.
# `filas` recibe la ventana y devuelve una lista de {icono, nombre, desc, dato, precio, puede, texto_boton, accion}; sin accion, no hay botón.

const ALTO_FILA := 28
const COLUMNAS := {"nombre": 230, "dato": 64, "precio": 80, "boton": 84}

var filas: Callable
var _lista: VBoxContainer
var _info: Label


func _init(titulo: String, proveedor: Callable, tam := Vector2(860, 540)) -> void:
	super(titulo, tam)
	filas = proveedor
	_info = Tema.etiqueta("", 14, Tema.TENUE)
	cuerpo.add_child(_info)
	cuerpo.add_child(_fila_encabezado())
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	cuerpo.add_child(scroll)
	_lista = VBoxContainer.new()
	_lista.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_lista.add_theme_constant_override("separation", 2)
	scroll.add_child(_lista)


func poner_info(t: String) -> void:
	_info.text = t


func _celda(texto: String, ancho: int, color := Tema.TEXTO, derecha := false) -> Label:
	var l := Tema.etiqueta(texto, 14, color)
	l.custom_minimum_size.x = ancho
	l.clip_text = true
	if derecha:
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	return l


func _fila_encabezado() -> HBoxContainer:
	var f := HBoxContainer.new()
	f.add_child(_celda("", 26))
	f.add_child(_celda("Nombre", COLUMNAS.nombre, Tema.TENUE))
	var d := _celda("Qué hace", 0, Tema.TENUE)
	d.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	f.add_child(d)
	f.add_child(_celda("Tenés", COLUMNAS.dato, Tema.TENUE, true))
	f.add_child(_celda("Precio", COLUMNAS.precio, Tema.TENUE, true))
	f.add_child(_celda("", COLUMNAS.boton))
	return f


func refrescar() -> void:
	for h in _lista.get_children():
		_lista.remove_child(h)
		h.queue_free()
	for datos: Dictionary in filas.call(self):
		var f := HBoxContainer.new()
		f.custom_minimum_size.y = ALTO_FILA
		f.add_child(_celda(datos.get("icono", ""), 26))
		f.add_child(_celda(datos.nombre, COLUMNAS.nombre))
		var d := _celda(datos.get("desc", ""), 0, Tema.TENUE)
		d.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		d.clip_text = false
		d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		d.tooltip_text = datos.get("desc", "")
		d.mouse_filter = Control.MOUSE_FILTER_PASS
		f.add_child(d)
		f.add_child(_celda(datos.get("dato", ""), COLUMNAS.dato, Tema.TEXTO, true))
		f.add_child(_celda(datos.get("precio", ""), COLUMNAS.precio, Tema.CALOR, true))
		if datos.has("accion"):
			var b := Tema.boton(datos.get("texto_boton", "Comprar"), datos.accion)
			b.custom_minimum_size = Vector2(COLUMNAS.boton, ALTO_FILA - 2)
			b.disabled = not datos.get("puede", true)
			f.add_child(b)
		else:
			f.add_child(_celda(datos.get("texto_boton", ""), COLUMNAS.boton, Tema.BIEN))
		_lista.add_child(f)
