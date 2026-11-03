class_name VentanaArbol
extends Ventana
# El árbol de habilidades: una columna por rama, sale todo de datos/habilidades.gd.
# Cada nodo se ve según su estado: bloqueado (apagado), mejorable (brasa), con niveles (cálido) o al máximo (oro).

const NODO := Vector2(114, 70)
const PASO := Vector2(122, 94)
const ENCABEZADO := 34.0

var juego: Juego
var al_gastar: Callable
var _lienzo: Control
var _botones := {}
var _pips := {}
var _ramas: Array = []      # [{x, ancho, rama}] para dibujar los títulos
var _puntos: PanelContainer
var _icono: Label
var _titulo_nodo: Label
var _desc: Label
var _pide: Label


func _init(j: Juego, gastar: Callable) -> void:
	super("🌳 Habilidades", Vector2(1100, 0))
	juego = j
	al_gastar = gastar
	_puntos = Tema.pastilla("● 0 puntos", Tema.ORO, 14)
	poner_extra(_puntos)
	_lienzo = Control.new()
	_lienzo.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_lienzo.draw.connect(_dibujar_lineas)
	cuerpo.add_child(_lienzo)
	var x := 0.0
	for rama: Dictionary in Habilidades.RAMAS:
		var ancho := (1 + _columnas_de(rama.id)) * PASO.x - (PASO.x - NODO.x)
		_ramas.append({"x": x, "ancho": ancho, "rama": rama})
		for id: String in Habilidades.NODOS:
			var n: Dictionary = Habilidades.NODOS[id]
			if n.rama == rama.id:
				_crear_nodo(id, n, Vector2(x + n.col * PASO.x, ENCABEZADO + n.fila * PASO.y))
		x += (1 + _columnas_de(rama.id)) * PASO.x + 8.0
	_lienzo.custom_minimum_size = Vector2(x - 8.0, ENCABEZADO + 4 * PASO.y - (PASO.y - NODO.y))
	cuerpo.add_child(_armar_detalle())


func _crear_nodo(id: String, n: Dictionary, pos: Vector2) -> void:
	var b := Tema.boton("", _gastar.bind(id))
	b.position = pos
	b.size = NODO
	b.mouse_entered.connect(_mostrar.bind(id))
	var caja := VBoxContainer.new()
	caja.set_anchors_preset(Control.PRESET_FULL_RECT)
	caja.alignment = BoxContainer.ALIGNMENT_CENTER
	caja.add_theme_constant_override("separation", 0)
	Tema.pasivo(caja)
	var icono := Tema.etiqueta(n.icono, 18)
	icono.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caja.add_child(Tema.pasivo(icono))
	var nombre := Tema.etiqueta(n.nombre, 11, Tema.TEXTO, true)
	nombre.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	nombre.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nombre.custom_minimum_size.y = 28
	nombre.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	caja.add_child(Tema.pasivo(nombre))
	var pips := Tema.etiqueta("", 10, Tema.TENUE)
	pips.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caja.add_child(Tema.pasivo(pips))
	b.add_child(caja)
	_lienzo.add_child(b)
	_botones[id] = b
	_pips[id] = pips


func _armar_detalle() -> Control:
	var tarjeta := PanelContainer.new()
	tarjeta.theme_type_variation = "Tarjeta"
	tarjeta.custom_minimum_size.y = 76
	var f := HBoxContainer.new()
	f.add_theme_constant_override("separation", 12)
	tarjeta.add_child(f)
	_icono = Tema.etiqueta("🌳", 32)
	_icono.custom_minimum_size.x = 48
	_icono.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_icono.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	f.add_child(_icono)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 1)
	f.add_child(v)
	_titulo_nodo = Tema.etiqueta("Pasá por una habilidad para ver qué hace.", 16, Tema.TEXTO, true)
	v.add_child(_titulo_nodo)
	_desc = Tema.etiqueta("Tocá las que brillan para mejorarlas. Las apagadas piden otra habilidad antes.", 13, Tema.TENUE)
	_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_desc)
	_pide = Tema.etiqueta("", 13, Tema.MAL)
	v.add_child(_pide)
	return tarjeta


func _columnas_de(rama: String) -> int:
	var mayor := 0
	for id: String in Habilidades.NODOS:
		if Habilidades.NODOS[id].rama == rama:
			mayor = maxi(mayor, int(Habilidades.NODOS[id].col))
	return mayor


func _gastar(id: String) -> void:
	al_gastar.call(id)
	refrescar()
	_mostrar(id)


func _mostrar(id: String) -> void:
	var n: Dictionary = Habilidades.NODOS[id]
	var d: Dictionary = juego.estado.d
	var pide := ""
	for req: String in n.get("requiere", {}):
		if int(d.arbol.get(req, 0)) < int(n.requiere[req]):
			pide += ("  " if not pide.is_empty() else "") + "Pide %s nivel %d." % [Habilidades.NODOS[req].nombre, n.requiere[req]]
	_icono.text = n.icono
	_titulo_nodo.text = "%s   nivel %d de %d · cuesta %d" % [n.nombre, int(d.arbol.get(id, 0)), n.max, n.costo]
	_desc.text = n.desc
	_pide.text = pide
	_pide.visible = not pide.is_empty()


func _estilo(id: String, d: Dictionary) -> Array:
	# Devuelve [normal, hover]: según el estado del nodo.
	var nivel := int(d.arbol.get(id, 0))
	var tope := int(Habilidades.NODOS[id].max)
	if nivel >= tope:
		return [Tema.caja(Color(0.3, 0.21, 0.07), Tema.ORO, 2, 9, 4.0, 4.0), Tema.caja(Color(0.38, 0.27, 0.09), Tema.ORO, 2, 9, 4.0, 4.0)]
	if Habilidades.se_puede(d, id):
		return [Tema.caja(Color(0.27, 0.15, 0.07), Tema.CALOR, 2, 9, 4.0, 4.0, 8), Tema.caja(Color(0.38, 0.21, 0.09), Color(1.0, 0.8, 0.5), 2, 9, 4.0, 4.0, 8)]
	if not Habilidades.abierto(d, id):
		return [Tema.caja(Color(0.07, 0.055, 0.045, 0.9), Color(0.17, 0.13, 0.1), 1, 9, 4.0, 4.0), Tema.caja(Color(0.1, 0.08, 0.065, 0.9), Color(0.26, 0.2, 0.15), 1, 9, 4.0, 4.0)]
	if nivel > 0:
		return [Tema.caja(Color(0.2, 0.13, 0.085), Color(0.6, 0.37, 0.17), 1, 9, 4.0, 4.0), Tema.caja(Color(0.26, 0.17, 0.1), Tema.CALOR, 1, 9, 4.0, 4.0)]
	return [Tema.caja(Tema.FONDO_2, Tema.BORDE, 1, 9, 4.0, 4.0), Tema.caja(Tema.FONDO_3, Tema.CALOR, 1, 9, 4.0, 4.0)]


func refrescar() -> void:
	var d: Dictionary = juego.estado.d
	var pts := Habilidades.puntos(d)
	Tema.texto_de(_puntos).text = "● %d %s" % [pts, "punto" if pts == 1 else "puntos"]
	Tema.texto_de(_puntos).add_theme_color_override("font_color", Tema.ORO if pts > 0 else Tema.APAGADO)
	for id: String in _botones:
		var n: Dictionary = Habilidades.NODOS[id]
		var nivel := int(d.arbol.get(id, 0))
		var b: Button = _botones[id]
		var est := _estilo(id, d)
		for k in ["normal", "disabled", "pressed"]:
			b.add_theme_stylebox_override(k, est[0])
		b.add_theme_stylebox_override("hover", est[1])
		b.modulate = Color(1, 1, 1, 0.5) if not Habilidades.abierto(d, id) else Color.WHITE
		var pip: Label = _pips[id]
		pip.text = "●".repeat(nivel) + "○".repeat(int(n.max) - nivel)
		pip.add_theme_color_override("font_color", Tema.ORO if nivel >= int(n.max) else (Tema.CALOR if nivel > 0 else Tema.APAGADO))
	_lienzo.queue_redraw()


func _dibujar_lineas() -> void:
	var d: Dictionary = juego.estado.d
	for r: Dictionary in _ramas:
		_lienzo.draw_string(Tema.fuente_fuerte(), Vector2(r.x + 2.0, 16.0), "%s %s" % [r.rama.icono, r.rama.nombre], HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Tema.CALOR)
		_lienzo.draw_line(Vector2(r.x, 25.0), Vector2(r.x + r.ancho, 25.0), Tema.BORDE_SUAVE, 1.0)
	for id: String in _botones:
		for req: String in Habilidades.NODOS[id].get("requiere", {}):
			var a: Button = _botones[req]
			var b: Button = _botones[id]
			var hecho := int(d.arbol.get(req, 0)) >= int(Habilidades.NODOS[id].requiere[req])
			var desde := a.position + Vector2(a.size.x * 0.5, a.size.y)
			var hasta := b.position + Vector2(b.size.x * 0.5, 0.0)
			if absf(a.position.y - b.position.y) < 1.0:
				desde = a.position + Vector2(a.size.x, a.size.y * 0.5)
				hasta = b.position + Vector2(0.0, b.size.y * 0.5)
			var curva := PackedVector2Array()
			var medio := (desde.y + hasta.y) * 0.5 if desde.y != hasta.y else desde.y
			for i in 13:
				var u := i / 12.0
				var c1 := Vector2(desde.x, medio) if desde.y != hasta.y else Vector2((desde.x + hasta.x) * 0.5, desde.y)
				var c2 := Vector2(hasta.x, medio) if desde.y != hasta.y else Vector2((desde.x + hasta.x) * 0.5, hasta.y)
				curva.append(desde.bezier_interpolate(c1, c2, hasta, u))
			if hecho:
				_lienzo.draw_polyline(curva, Color(Tema.CALOR, 0.22), 7.0, true)
			_lienzo.draw_polyline(curva, Tema.CALOR if hecho else Color(0.3, 0.23, 0.17), 2.5 if hecho else 2.0, true)
