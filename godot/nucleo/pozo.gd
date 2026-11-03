class_name Pozo
extends RefCounted
# Un pozo de fogata: su leña, lecho de brasas y aire. Se dibuja en mundo/vista_pozo.gd.

var indice := 0
var tam := 0
var techo := false
var lenos: Array[Leno] = []
var lecho := 0.0
var ceniza := 0.0
var carga := 0.0
var relacion_carga := 0.0
var aire := 1.0
var lluvia := 0.0
var fuelle := 0.0
var intensidad := 0.0
var destello := 0.0
var ardiendo := 0
var calidad := 0.0 # fogata armada: 0 si no hay leña de los tres cortes
var armada := false
var armada_anotada := false
var pico_t := 0.0
var s_aire := 1.0
var s_prende := 1.0
var s_quema := 1.0
var bonus_armada := 0.0
var ventajas: Dictionary
var centro := Vector3.ZERO # lo pone la vista


func _init(i: int, t: int, con_techo: bool) -> void:
	indice = i
	techo = con_techo
	cambiar_tam(t)


func cambiar_tam(t: int) -> void:
	tam = clampi(t, 0, Fogones.MAXIMO)
	ventajas = Fogones.ventajas(tam)


func spec() -> Dictionary:
	return Fogones.de(tam)


# Cuántas piezas de ese corte entran. Un corte cerrado sigue cerrado aunque haya mejoras.
func cupo(corte: String, mods: Dictionary) -> int:
	var base: int = spec().cupo[corte]
	return 0 if base == 0 else base + int(mods["cupo_" + corte])


func cuantos(corte: String) -> int:
	var n := 0
	for l in lenos:
		if l.madera.corte == corte:
			n += 1
	return n


func capacidad(mods: Dictionary) -> float:
	var suma := 0.0
	for corte: String in Maderas.ORDEN_CORTES:
		var c: Dictionary = Maderas.CORTES[corte]
		suma += cupo(corte, mods) * c.largo_px * c.grosor_px
	return maxf(1.0, suma)


func holgura(mods: Dictionary) -> float:
	return sqrt(capacidad(mods) / maxf(1.0, Fogones.area_base(tam)))


# Multiplicador de calor por tamaño, diluido si el pozo está casi vacío. mult/tipis: cada cuerpo de fuego ya suma su propio calor.
func mult_calor(mods: Dictionary) -> float:
	var s := spec()
	var f := clampf(carga / maxf(1.0, Fogones.area_base(tam)) / maxf(0.05, mods.fill_threshold), 0.0, 1.0)
	return 1.0 + (float(s.mult) / s.tipis - 1.0) * f


func prendido() -> bool:
	return lecho > 0.08 or lenos.any(func(l: Leno) -> bool: return l.ardiendo())
