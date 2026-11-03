class_name VentanaArbol
extends Ventana
# El árbol de habilidades: una columna por rama, sale todo de datos/habilidades.gd.

const NODO := Vector2(112, 52)
const PASO := Vector2(122, 92)
const ANCHO_RAMA := 2

var juego: Juego
var al_gastar: Callable
var _lienzo: Control
var _botones := {}
var _info: Label


func _init(j: Juego, gastar: Callable) -> void:
	super("🌳 Habilidades", Vector2(1160, 590))
	juego = j
	al_gastar = gastar
	_lienzo = Control.new()
	_lienzo.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_lienzo.custom_minimum_size = Vector2(1130, 460)
	_lienzo.draw.connect(_dibujar_lineas)
	cuerpo.add_child(_lienzo)
	var x := 0.0
	for rama: Dictionary in Habilidades.RAMAS:
		var ancho := 1 + _columnas_de(rama.id)
		var t := Tema.etiqueta("%s %s" % [rama.icono, rama.nombre], 16, Tema.CALOR)
		t.position = Vector2(x + 2.0, 0.0)
		_lienzo.add_child(t)
		for id: String in Habilidades.NODOS:
			var n: Dictionary = Habilidades.NODOS[id]
			if n.rama != rama.id:
				continue
			var b := Tema.boton("", _gastar.bind(id))
			b.position = Vector2(x + n.col * PASO.x, 28.0 + n.fila * PASO.y)
			b.size = NODO
			b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			b.add_theme_font_size_override("font_size", 12)
			b.mouse_entered.connect(_mostrar.bind(id))
			_lienzo.add_child(b)
			_botones[id] = b
		x += ancho * PASO.x + 8.0
	_info = Tema.etiqueta("Pasá por una habilidad para ver qué hace.", 15)
	_info.custom_minimum_size.y = 42
	_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cuerpo.add_child(_info)


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
			pide = "  Pide: %s nivel %d." % [Habilidades.NODOS[req].nombre, n.requiere[req]]
	_info.text = "%s %s (%d/%d, cuesta %d)\n%s%s" % [n.icono, n.nombre, int(d.arbol.get(id, 0)), n.max, n.costo, n.desc, pide]


func refrescar() -> void:
	var d: Dictionary = juego.estado.d
	poner_titulo("🌳 Habilidades · puntos: %d" % Habilidades.puntos(d))
	for id: String in _botones:
		var n: Dictionary = Habilidades.NODOS[id]
		var nivel := int(d.arbol.get(id, 0))
		var b: Button = _botones[id]
		b.text = "%s %s\n%d/%d" % [n.icono, n.nombre, nivel, n.max]
		if Habilidades.se_puede(d, id):
			b.modulate = Color(1.25, 1.1, 0.75)
		elif not Habilidades.abierto(d, id):
			b.modulate = Color(0.5, 0.5, 0.5)
		else:
			b.modulate = Color.WHITE
	_lienzo.queue_redraw()


func _dibujar_lineas() -> void:
	var d: Dictionary = juego.estado.d
	for id: String in _botones:
		for req: String in Habilidades.NODOS[id].get("requiere", {}):
			var a: Button = _botones[req]
			var b: Button = _botones[id]
			var hecho := int(d.arbol.get(req, 0)) >= int(Habilidades.NODOS[id].requiere[req])
			_lienzo.draw_line(a.position + a.size * 0.5, b.position + b.size * 0.5, Tema.CALOR if hecho else Color(0.3, 0.24, 0.18), 2.0)
