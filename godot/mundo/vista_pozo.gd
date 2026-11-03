class_name VistaPozo
extends Node3D
# Lo que se ve de un pozo: piedras, lecho, lo construido, techo, luz, chispas y humo. Todo sale de su escalón en datos/fogones.gd.

var pozo: Pozo
var _ruido: Texture2D
var _ruido_normal: Texture2D
var _construido: Node3D
var _lecho: ShaderMaterial
var _luz: OmniLight3D
var _chispas: GPUParticles3D
var _humo: GPUParticles3D
var _chispa_mat: StandardMaterial3D


func configurar(p: Pozo, ruido: Texture2D, ruido_normal: Texture2D) -> void:
	pozo = p
	_ruido = ruido
	_ruido_normal = ruido_normal
	_luz = OmniLight3D.new()
	_luz.shadow_enabled = p.indice < 2
	_luz.shadow_blur = 2.0
	_luz.light_size = 0.12
	_luz.omni_attenuation = 1.4
	add_child(_luz)
	_crear_particulas()
	armar()


func _material(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.albedo_texture = _ruido
	m.normal_enabled = true
	m.normal_texture = _ruido_normal
	m.normal_scale = 1.4
	m.roughness = 0.93
	m.uv1_triplanar = true
	m.uv1_scale = Vector3.ONE * 0.8
	return m


# Rehace lo construido al cambiar de escalón o poner techo.
func armar() -> void:
	if _construido:
		_construido.queue_free()
	_construido = Node3D.new()
	add_child(_construido)
	var s := pozo.spec()
	_crear_lecho(s.radio)
	_crear_piedras(s)
	for parte: Dictionary in s.partes:
		_crear_parte(parte)
	if pozo.techo and not pozo.ventajas.cubierto:
		_crear_techo(s.radio)
	_crear_paredes(s.radio)
	_chispa_mat.albedo_color = Color.WHITE
	(_chispas.process_material as ParticleProcessMaterial).color = Llamas.TODAS[s.llama].chispa
	_luz.light_color = Llamas.TODAS[s.llama].luz


func _crear_lecho(radio: float) -> void:
	var plano := PlaneMesh.new()
	plano.size = Vector2.ONE * radio * 2.3
	_lecho = ShaderMaterial.new()
	_lecho.shader = preload("res://shaders/lecho.gdshader")
	_lecho.set_shader_parameter("ruido", _ruido)
	plano.material = _lecho
	var malla := MeshInstance3D.new()
	malla.mesh = plano
	malla.position.y = 0.006
	_construido.add_child(malla)


func _crear_piedras(s: Dictionary) -> void:
	var material := _material(Fogones.PIEDRA)
	var mallas := []
	for i in 5:
		mallas.append(_malla_piedra(material))
	for hilera in s.hileras:
		for i in s.piedras - hilera * 3:
			var angulo: float = TAU * (i + 0.5 * hilera) / (s.piedras - hilera * 3) + randf_range(-0.04, 0.04)
			var tam: float = randf_range(0.13, 0.19) * (1.0 - hilera * 0.1)
			var piedra := MeshInstance3D.new()
			piedra.mesh = mallas.pick_random()
			piedra.scale = Vector3(randf_range(0.95, 1.25), randf_range(0.6, 0.85), randf_range(0.95, 1.25)) * tam
			piedra.rotation.y = randf() * TAU
			piedra.position = Vector3(cos(angulo), 0.0, sin(angulo)) * (s.radio + 0.1) + Vector3.UP * (tam * 0.4 + hilera * 0.14)
			_construido.add_child(piedra)


# Esfera unitaria deformada con ruido. Las normales se promedian por posición para que no se note la costura.
func _malla_piedra(material: Material) -> ArrayMesh:
	var esfera := SphereMesh.new()
	esfera.radius = 1.0
	esfera.height = 2.0
	esfera.radial_segments = 24
	esfera.rings = 14
	var datos := esfera.get_mesh_arrays()
	var vertices: PackedVector3Array = datos[Mesh.ARRAY_VERTEX]
	var indices: PackedInt32Array = datos[Mesh.ARRAY_INDEX]
	var ruido := FastNoiseLite.new()
	ruido.seed = randi()
	ruido.frequency = 0.8
	ruido.fractal_octaves = 3
	for i in vertices.size():
		var dir := vertices[i].normalized()
		vertices[i] = dir * (1.0 + ruido.get_noise_3dv(dir) * 0.38)
	var por_posicion := {}
	for t in range(0, indices.size(), 3):
		var a := vertices[indices[t]]
		var b := vertices[indices[t + 1]]
		var c := vertices[indices[t + 2]]
		var cara := (b - a).cross(c - a)
		for v: Vector3 in [a, b, c]:
			var clave := Vector3i((v * 1000.0).round())
			por_posicion[clave] = por_posicion.get(clave, Vector3.ZERO) + cara
	var normales := PackedVector3Array()
	normales.resize(vertices.size())
	for i in vertices.size():
		var suma: Vector3 = por_posicion[Vector3i((vertices[i] * 1000.0).round())]
		normales[i] = suma.normalized() * signf(suma.dot(vertices[i]))
	datos[Mesh.ARRAY_VERTEX] = vertices
	datos[Mesh.ARRAY_NORMAL] = normales
	var malla := ArrayMesh.new()
	malla.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, datos)
	malla.surface_set_material(0, material)
	return malla


func _crear_parte(parte: Dictionary) -> void:
	var tam := Vector3(parte.tam[0], parte.tam[1], parte.tam[2])
	var nodo := MeshInstance3D.new()
	match parte.forma:
		"caja":
			var caja := BoxMesh.new()
			caja.size = tam
			nodo.mesh = caja
		"cilindro":
			var cil := CylinderMesh.new()
			cil.top_radius = 0.42
			cil.bottom_radius = 0.5
			cil.height = 1.0
			cil.radial_segments = 20
			nodo.mesh = cil
			nodo.scale = tam
		"esfera":
			var esf := SphereMesh.new()
			esf.radius = 0.5
			esf.height = 1.0
			nodo.mesh = esf
			nodo.scale = tam
	nodo.material_override = _material(parte.color)
	nodo.position = Vector3(parte.pos[0], parte.pos[1], parte.pos[2])
	_construido.add_child(nodo)


func _crear_techo(radio: float) -> void:
	var madera := _material(Color(0.25, 0.16, 0.09))
	var alto := 2.1 + radio * 0.5
	for lado: Vector2 in [Vector2(-1, -1), Vector2(1, -1), Vector2(-1, 1), Vector2(1, 1)]:
		_crear_parte({"forma": "caja", "pos": [lado.x * (radio + 0.3), alto * 0.5, lado.y * (radio + 0.3)], "tam": [0.08, alto, 0.08], "color": Color(0.25, 0.16, 0.09)})
	var paja := CylinderMesh.new()
	paja.top_radius = 0.0
	paja.bottom_radius = (radio + 0.3) * 1.65
	paja.height = 0.8
	paja.radial_segments = 4
	var nodo := MeshInstance3D.new()
	nodo.mesh = paja
	nodo.material_override = madera
	nodo.material_override.albedo_color = Color(0.45, 0.36, 0.17)
	nodo.position.y = alto + 0.4
	nodo.rotation.y = PI * 0.25
	_construido.add_child(nodo)


# Un aro que no se ve mantiene la leña dentro del pozo: acá no se castiga con piezas que se escapan.
func _crear_paredes(radio: float) -> void:
	var lados := 20
	var pared := StaticBody3D.new()
	pared.collision_layer = 2
	pared.collision_mask = 0
	for i in lados:
		var angulo := TAU * i / lados
		var forma := CollisionShape3D.new()
		var caja := BoxShape3D.new()
		caja.size = Vector3(0.3, 3.0, TAU * (radio + 0.15) / lados + 0.04)
		forma.shape = caja
		forma.position = Vector3(cos(angulo), 0.0, sin(angulo)) * (radio + 0.15) + Vector3.UP * 1.5
		forma.rotation.y = -angulo
		pared.add_child(forma)
	_construido.add_child(pared)


func _crear_particulas() -> void:
	var punto := SphereMesh.new()
	punto.radius = 0.5
	punto.height = 1.0
	punto.radial_segments = 6
	punto.rings = 3
	_chispa_mat = StandardMaterial3D.new()
	_chispa_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_chispa_mat.vertex_color_use_as_albedo = true
	punto.material = _chispa_mat
	var p := ParticleProcessMaterial.new()
	p.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.42
	p.direction = Vector3.UP
	p.spread = 22.0
	p.initial_velocity_min = 0.5
	p.initial_velocity_max = 1.7
	p.gravity = Vector3(0.0, 0.5, 0.0)
	p.turbulence_enabled = true
	p.turbulence_noise_strength = 1.4
	p.scale_min = 0.008
	p.scale_max = 0.02
	_chispas = GPUParticles3D.new()
	_chispas.amount = 60
	_chispas.lifetime = 2.6
	_chispas.emitting = false
	_chispas.position.y = 0.3
	_chispas.visibility_aabb = AABB(Vector3(-4, -1, -4), Vector3(8, 10, 8))
	_chispas.process_material = p
	_chispas.draw_pass_1 = punto
	add_child(_chispas)

	var tex := GradientTexture2D.new()
	var grad := Gradient.new()
	grad.colors = PackedColorArray([Color(1, 1, 1, 0.55), Color(1, 1, 1, 0)])
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(0.5, 0.0)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.vertex_color_use_as_albedo = true
	mat.albedo_texture = tex
	var cuadro := QuadMesh.new()
	cuadro.material = mat
	var h := ParticleProcessMaterial.new()
	h.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	h.emission_sphere_radius = 0.2
	h.direction = Vector3.UP
	h.spread = 10.0
	h.initial_velocity_min = 0.3
	h.initial_velocity_max = 0.6
	h.gravity = Vector3(0.05, 0.2, 0.0)
	h.scale_min = 0.5
	h.scale_max = 1.0
	var curva := Curve.new()
	curva.add_point(Vector2(0.0, 0.35))
	curva.add_point(Vector2(1.0, 1.0))
	var curva_tex := CurveTexture.new()
	curva_tex.curve = curva
	h.scale_curve = curva_tex
	var color := Gradient.new()
	color.offsets = PackedFloat32Array([0.0, 0.25, 1.0])
	color.colors = PackedColorArray([Color(0.06, 0.055, 0.055, 0.0), Color(0.06, 0.055, 0.055, 0.14), Color(0.04, 0.04, 0.05, 0.0)])
	var color_tex := GradientTexture1D.new()
	color_tex.gradient = color
	h.color_ramp = color_tex
	_humo = GPUParticles3D.new()
	_humo.amount = 26
	_humo.lifetime = 5.0
	_humo.emitting = false
	_humo.position.y = 1.0
	_humo.visibility_aabb = AABB(Vector3(-5, -2, -5), Vector3(10, 12, 10))
	_humo.process_material = h
	_humo.draw_pass_1 = cuadro
	add_child(_humo)


func _process(_delta: float) -> void:
	var i := clampf(pozo.intensidad / (2.5 * pozo.spec().tipis), 0.0, 1.0)
	var t := Time.get_ticks_msec()
	var parpadeo := 0.86 + 0.14 * sin(t * 0.011) * sin(t * 0.0037)
	_luz.light_energy = ((0.25 + i * 3.6) * parpadeo + pozo.destello * 1.5) if pozo.prendido() else 0.0
	_luz.omni_range = 4.0 + i * 7.0 * pozo.spec().hs
	_luz.position.y = 0.55 + i * 0.5
	_lecho.set_shader_parameter("calor", clampf(pozo.lecho + i * 0.5, 0.0, 1.0))
	_chispas.amount_ratio = clampf(i * 1.6, 0.05, 1.0)
	_chispas.emitting = i > 0.1
	_humo.emitting = pozo.prendido()
