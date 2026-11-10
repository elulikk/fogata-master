class_name Mundo
extends Node3D
# El lugar: cielo y luz según la hora, suelo, bosque y lluvia.

# Cada fase del cielo. Un momento del día nuevo es una entrada acá y su peso en _pesos.
const CIELOS := {
	"day": {"arriba": Color(0.25, 0.45, 0.8), "horizonte": Color(0.7, 0.75, 0.85), "sol": Color(1.0, 0.95, 0.85), "fuerza": 1.1, "niebla": Color(0.5, 0.55, 0.65)},
	"dusk": {"arriba": Color(0.12, 0.1, 0.28), "horizonte": Color(0.75, 0.38, 0.2), "sol": Color(1.0, 0.6, 0.35), "fuerza": 0.35, "niebla": Color(0.2, 0.12, 0.13)},
	"night": {"arriba": Color(0.012, 0.022, 0.06), "horizonte": Color(0.1, 0.075, 0.12), "sol": Color(0.45, 0.55, 0.85), "fuerza": 0.14, "niebla": Color(0.055, 0.05, 0.085)},
	"deep": {"arriba": Color(0.004, 0.008, 0.03), "horizonte": Color(0.03, 0.03, 0.06), "sol": Color(0.4, 0.5, 0.85), "fuerza": 0.06, "niebla": Color(0.02, 0.02, 0.04)},
}

var ruido: NoiseTexture2D
var ruido_normal: NoiseTexture2D
var _cielo: ProceduralSkyMaterial
var _ambiente: Environment
var _astro: DirectionalLight3D
var _lluvia: GPUParticles3D
var _pesos := {}


func _ready() -> void:
	ruido = _crear_ruido(false)
	ruido_normal = _crear_ruido(true)
	_crear_ambiente()
	_crear_suelo()
	_crear_bosque()
	_crear_rocas()
	_crear_lluvia()


func _crear_ruido(normal: bool) -> NoiseTexture2D:
	var r := FastNoiseLite.new()
	r.noise_type = FastNoiseLite.TYPE_PERLIN
	r.frequency = 0.012
	r.fractal_octaves = 5
	var t := NoiseTexture2D.new()
	t.width = 512
	t.height = 512
	t.seamless = true
	t.noise = r
	t.normalize = true
	t.as_normal_map = normal
	t.bump_strength = 6.0
	t.generate_mipmaps = true
	return t


func _crear_ambiente() -> void:
	_cielo = ProceduralSkyMaterial.new()
	_cielo.sun_angle_max = 0.0
	var cielo := Sky.new()
	cielo.sky_material = _cielo
	_ambiente = Environment.new()
	_ambiente.background_mode = Environment.BG_SKY
	_ambiente.sky = cielo
	_ambiente.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	_ambiente.ambient_light_energy = 1.1
	_ambiente.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	_ambiente.glow_enabled = true
	_ambiente.glow_intensity = 0.45
	_ambiente.glow_bloom = 0.02
	_ambiente.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	_ambiente.fog_enabled = true
	_ambiente.fog_density = 0.035
	_ambiente.ssao_enabled = true
	_ambiente.ssao_radius = 0.5
	_ambiente.ssao_intensity = 2.0
	var mundo := WorldEnvironment.new()
	mundo.environment = _ambiente
	add_child(mundo)
	_astro = DirectionalLight3D.new()
	_astro.rotation_degrees = Vector3(-52.0, -35.0, 0.0)
	_astro.shadow_enabled = true
	add_child(_astro)


func _crear_suelo() -> void:
	var plano := PlaneMesh.new()
	plano.size = Vector2(70.0, 70.0)
	plano.subdivide_width = 180
	plano.subdivide_depth = 180
	var m := ShaderMaterial.new()
	m.shader = preload("res://shaders/suelo.gdshader")
	m.set_shader_parameter("ruido", ruido)
	m.set_shader_parameter("ruido_normal", ruido_normal)
	plano.material = m
	var malla := MeshInstance3D.new()
	malla.mesh = plano
	malla.extra_cull_margin = 4.0
	add_child(malla)
	var cuerpo := StaticBody3D.new()
	var forma := CollisionShape3D.new()
	var caja := BoxShape3D.new()
	caja.size = Vector3(70.0, 1.0, 70.0)
	forma.shape = caja
	forma.position.y = -0.5
	cuerpo.add_child(forma)
	var fisica := PhysicsMaterial.new()
	fisica.friction = 1.0
	fisica.bounce = 0.0
	cuerpo.physics_material_override = fisica
	add_child(cuerpo)


func _crear_bosque() -> void:
	var corteza := StandardMaterial3D.new()
	corteza.albedo_color = Color(0.09, 0.065, 0.05)
	corteza.roughness = 1.0
	var copa_mat := StandardMaterial3D.new()
	copa_mat.albedo_color = Color(0.022, 0.05, 0.035)
	copa_mat.roughness = 1.0
	var tronco := CylinderMesh.new()
	tronco.top_radius = 0.12
	tronco.bottom_radius = 0.26
	tronco.height = 5.0
	tronco.radial_segments = 8
	tronco.material = corteza
	var copa := CylinderMesh.new()
	copa.top_radius = 0.0
	copa.bottom_radius = 1.0
	copa.height = 2.6
	copa.radial_segments = 9
	copa.material = copa_mat
	for i in 80:
		var angulo := randf() * TAU
		var dist := randf_range(10.0, 32.0)
		var arbol := Node3D.new()
		arbol.position = Vector3(cos(angulo), 0.0, sin(angulo)) * dist
		arbol.scale = Vector3.ONE * randf_range(0.8, 1.6)
		var t := MeshInstance3D.new()
		t.mesh = tronco
		t.position.y = 2.2
		arbol.add_child(t)
		for nivel in 4:
			var c := MeshInstance3D.new()
			c.mesh = copa
			c.position.y = 3.2 + nivel * 1.25
			c.scale = Vector3.ONE * (1.65 - nivel * 0.34)
			arbol.add_child(c)
		add_child(arbol)


# Piedras del pack sueltas por el claro, lejos del lugar de las fogatas.
func _crear_rocas() -> void:
	var modelos := Modelos.piedras()
	if modelos.is_empty():
		return
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.27, 0.26, 0.25)
	m.albedo_texture = ruido
	m.normal_enabled = true
	m.normal_texture = ruido_normal
	m.roughness = 0.95
	m.uv1_triplanar = true
	m.uv1_scale = Vector3.ONE * 0.5
	for i in 18:
		var datos: Dictionary = modelos.pick_random()
		var caja: AABB = datos.aabb
		var angulo := randf() * TAU
		var dist := randf_range(4.5, 11.0)
		var tam := randf_range(0.25, 0.9) * (dist / 6.0)
		var k := tam / maxf(0.01, maxf(caja.size.x, caja.size.z))
		var base := Basis(Vector3.UP, randf() * TAU) * Basis.from_scale(Vector3.ONE * k)
		var apoyo := Vector3(caja.get_center().x, caja.position.y + caja.size.y * 0.15, caja.get_center().z)
		var roca := MeshInstance3D.new()
		roca.mesh = datos.mesh
		roca.material_override = m
		roca.transform = Transform3D(base, Vector3(cos(angulo), 0.0, sin(angulo)) * dist - base * apoyo)
		add_child(roca)


func _crear_lluvia() -> void:
	var gota := BoxMesh.new()
	gota.size = Vector3(0.008, 0.28, 0.008)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = Color(0.7, 0.78, 0.9, 0.35)
	gota.material = m
	var p := ParticleProcessMaterial.new()
	p.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	p.emission_box_extents = Vector3(11.0, 0.5, 11.0)
	p.direction = Vector3(-0.06, -1.0, 0.0)
	p.spread = 1.0
	p.initial_velocity_min = 11.0
	p.initial_velocity_max = 14.0
	p.gravity = Vector3.ZERO
	_lluvia = GPUParticles3D.new()
	_lluvia.amount = 1800
	_lluvia.lifetime = 0.8
	_lluvia.local_coords = false
	_lluvia.position = Vector3(0.0, 9.0, 0.0)
	_lluvia.visibility_aabb = AABB(Vector3(-14, -12, -14), Vector3(28, 14, 28))
	_lluvia.process_material = p
	_lluvia.draw_pass_1 = gota
	_lluvia.emitting = false
	add_child(_lluvia)


# Cuánto pesa cada fase ahora. Antes de abrir las noches es un atardecer ya oscuro, que luce el fuego.
func _pesos_de(j: Juego) -> Dictionary:
	var w := {"day": 0.0, "dusk": 0.0, "night": 0.0, "deep": 0.0}
	var ni := j.estado.info_noche()
	var a: float = ni.avance
	match ni.fase:
		"off":
			w.dusk = 0.3
			w.night = 0.7
		"day":
			w.day = 1.0
		"dusk":
			if a < 0.5:
				w.day = 1.0 - 2.0 * a
				w.dusk = 2.0 * a
			else:
				w.dusk = 2.0 - 2.0 * a
				w.night = 2.0 * a - 1.0
		"night":
			var e := smoothstep(0.0, 1.0, minf(1.0, a * 3.0))
			w.night = 1.0 - e
			w.deep = e
	return w


func actualizar(dt: float, j: Juego) -> void:
	var meta := _pesos_de(j)
	if _pesos.is_empty():
		_pesos = meta
	var arriba := Color.BLACK
	var horizonte := Color.BLACK
	var sol := Color.BLACK
	var niebla := Color.BLACK
	var fuerza := 0.0
	for k: String in CIELOS:
		_pesos[k] = lerpf(_pesos[k], meta[k], minf(1.0, dt * 0.9))
		var c: Dictionary = CIELOS[k]
		var w: float = _pesos[k]
		arriba += c.arriba * w
		horizonte += c.horizonte * w
		sol += c.sol * w
		niebla += c.niebla * w
		fuerza += c.fuerza * w
	var nubes: float = j.clima.lluvia * 0.55 + j.clima.viento * 0.08
	var oscuro := 1.0 - nubes
	_cielo.sky_top_color = arriba * oscuro
	_cielo.sky_horizon_color = horizonte * oscuro
	_cielo.ground_horizon_color = horizonte * oscuro
	_cielo.ground_bottom_color = horizonte * 0.1
	_ambiente.fog_light_color = niebla * oscuro
	_astro.light_color = sol
	_astro.light_energy = fuerza * oscuro + j.clima.relampago * 2.5
	_lluvia.emitting = j.clima.lluvia > 0.02
	_lluvia.amount_ratio = clampf(j.clima.lluvia, 0.02, 1.0)
