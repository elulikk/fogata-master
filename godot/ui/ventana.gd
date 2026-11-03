class_name Ventana
extends PanelContainer
# Marco común de todas las ventanas: título, cierre y contenido. Abrir una pausa el juego (lo maneja ui.gd).

signal cerrar

var cuerpo: VBoxContainer
var _titulo: Label
var _extra: HBoxContainer


func _init(titulo: String, tam: Vector2) -> void:
	custom_minimum_size = tam
	set_anchors_preset(Control.PRESET_CENTER)
	grow_horizontal = Control.GROW_DIRECTION_BOTH
	grow_vertical = Control.GROW_DIRECTION_BOTH
	var caja := VBoxContainer.new()
	caja.add_theme_constant_override("separation", 6)
	add_child(caja)
	var arriba := HBoxContainer.new()
	caja.add_child(arriba)
	_titulo = Tema.etiqueta(titulo, 20, Tema.CALOR)
	_titulo.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	arriba.add_child(_titulo)
	_extra = HBoxContainer.new()
	arriba.add_child(_extra)
	arriba.add_child(Tema.boton("✕", func() -> void: cerrar.emit()))
	cuerpo = VBoxContainer.new()
	cuerpo.size_flags_vertical = Control.SIZE_EXPAND_FILL
	caja.add_child(cuerpo)


func poner_extra(c: Control) -> void:
	_extra.add_child(c)


func vaciar_extra() -> void:
	for h in _extra.get_children():
		h.queue_free()


func poner_titulo(t: String) -> void:
	_titulo.text = t


func refrescar() -> void:
	pass
