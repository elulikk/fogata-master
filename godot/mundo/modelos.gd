class_name Modelos
# Modelos 3D de afuera (carpeta modelos/), cargados una sola vez. Si un modelo falta, quien lo pide usa su forma por código.
#   piedras.glb: pack de piedras estilizadas, una malla por piedra.
#   lena_<id>/: leña de Quixel Megascans; lena.glb más BaseColor, Normal, Roughness y AO.

static var _piedras: Array = []
static var _lenas := {}


# Cada malla que haya en la escena, con su caja.
static func _mallas(ruta: String) -> Array:
	var fuera := []
	if not ResourceLoader.exists(ruta):
		return fuera
	var escena: PackedScene = load(ruta)
	if escena == null:
		return fuera
	var raiz := escena.instantiate()
	var pendientes: Array[Node] = [raiz]
	while not pendientes.is_empty():
		var n: Node = pendientes.pop_back()
		pendientes.append_array(n.get_children())
		if n is MeshInstance3D and n.mesh:
			fuera.append({"mesh": n.mesh, "aabb": n.mesh.get_aabb()})
	raiz.free()
	return fuera


static func piedras() -> Array:
	if _piedras.is_empty():
		_piedras = _mallas("res://modelos/piedras.glb")
	return _piedras


static func lena(id: String) -> Dictionary:
	if _lenas.has(id):
		return _lenas[id]
	var carpeta := "res://modelos/%s/" % id
	var mallas := _mallas(carpeta + "lena.glb")
	var fuera := {}
	if not mallas.is_empty():
		fuera = mallas[0]
		for mapa: String in ["BaseColor", "Normal", "Roughness", "AO"]:
			fuera[mapa] = load(carpeta + mapa + ".jpg") if ResourceLoader.exists(carpeta + mapa + ".jpg") else null
	_lenas[id] = fuera
	return fuera
