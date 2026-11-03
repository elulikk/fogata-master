class_name Ventana
extends PanelContainer
# Marco común de todas las ventanas: título, cierre y contenido. Abrir una pausa el juego (lo maneja ui.gd).
# Entra con un fundido corto; Esc la cierra (lo maneja main.gd).

signal cerrar

var cuerpo: VBoxContainer
var _titulo: Label
var _extra: HBoxContainer


func _init(titulo: String, tam: Vector2, con_cierre := true) -> void:
	custom_minimum_size = tam
	set_anchors_preset(Control.PRESET_CENTER)
	grow_horizontal = Control.GROW_DIRECTION_BOTH
	grow_vertical = Control.GROW_DIRECTION_BOTH
	var caja := VBoxContainer.new()
	caja.add_theme_constant_override("separation", 8)
	add_child(caja)
	var arriba := HBoxContainer.new()
	arriba.add_theme_constant_override("separation", 8)
	caja.add_child(arriba)
	_titulo = Tema.etiqueta(titulo, 22, Tema.CALOR, true)
	_titulo.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	arriba.add_child(_titulo)
	_extra = HBoxContainer.new()
	arriba.add_child(_extra)
	if con_cierre:
		var x := Tema.boton("✕", func() -> void: cerrar.emit(), "Plano")
		x.tooltip_text = "Cerrar (Esc)"
		x.add_theme_font_size_override("font_size", 16)
		arriba.add_child(x)
	caja.add_child(HSeparator.new())
	cuerpo = VBoxContainer.new()
	cuerpo.add_theme_constant_override("separation", 8)
	cuerpo.size_flags_vertical = Control.SIZE_EXPAND_FILL
	caja.add_child(cuerpo)
	modulate.a = 0.0


func _ready() -> void:
	# El pivote se calcula cuando ya tiene su tamaño final.
	await get_tree().process_frame
	pivot_offset = size * 0.5
	scale = Vector2.ONE * 0.96
	var t := create_tween().set_parallel()
	t.tween_property(self, "modulate:a", 1.0, 0.14)
	t.tween_property(self, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func poner_extra(c: Control) -> void:
	_extra.add_child(c)


func vaciar_extra() -> void:
	for h in _extra.get_children():
		h.queue_free()


func poner_titulo(t: String) -> void:
	_titulo.text = t


func refrescar() -> void:
	pass
