class_name Leno
extends RefCounted
# Una pieza de leña en el fuego: solo su estado. Se ve y cae en mundo/vista_pieza.gd.
# Estados: cruda → llama → brasas → ceniza.

var clave := ""
var madera: Dictionary
var pozo: Pozo
var estado := "cruda"
var temp := 0.0
var humedad := 0.0
var combustible := 1.0
var combustible_max := 1.0
var llama := 0.0
var brasa := 0.0
var calor_sale := 0.0
var ahogada := false
var tiempo_bajo := 0.0
var tiempo_rebrote := 0.0
var secando := 0.0
var aire := 1.0
var lluvia := 0.0
var pos := Vector3.ZERO # lo escribe la vista cada cuadro


func _init(k: String, p: Pozo, mods: Dictionary) -> void:
	clave = k
	madera = Maderas.de(k)
	pozo = p
	humedad = madera.humedad
	combustible_max = madera.combustible * mods.fuel * mods.fuel_mult
	combustible = combustible_max


func ardiendo() -> bool:
	return estado == "llama" or estado == "brasas"


func tamano() -> float:
	return 0.55 + 0.45 * maxf(0.0, combustible) / combustible_max


func area() -> float:
	return madera.largo_px * madera.grosor_px * tamano()


func cambiar_madera(k: String) -> void:
	clave = k
	madera = Maderas.de(k)
	combustible_max = combustible
