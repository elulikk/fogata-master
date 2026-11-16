class_name VistaPieza
extends RigidBody3D
# Cómo se ve y cae una pieza de leña. La física es solo visual: el juego cuenta cantidades, no posiciones.

const QUIETA_LINEAL := 0.07
const QUIETA_ANGULAR := 0.3
const SEGUNDOS_PARA_CALMARSE := 0.8
# Color medio de las texturas de leña de Quixel: el tinte de cada especie se mide contra este.
const COLOR_MODELO := Color("725843")
# Un modelo se estira a lo largo como mucho esto respecto de su grosor, para que la textura no se deforme.
const ESTIRA_MAXIMO := 1.8

static var _materiales_llama := {}

# La primera vez que una pieza soltada desde arriba toca algo: ahí suena el golpe y saltan chispas.
signal aterrizo(pieza: VistaPieza, fuerza: float)

var leno: Leno
var _vel_previa := 0.0
var _mesh: MeshInstance3D
var _forma: CylinderShape3D
var _material: ShaderMaterial
var _mat_codigo: ShaderMaterial
var _mat_modelo: ShaderMaterial
var _modelo: MeshInstance3D
var _llamas: GPUParticles3D
var _ruido: Texture2D
var _ruido_normal: Texture2D
var _tiempo_quieta := 0.0


func configurar(l: Leno, ruido: Texture2D, ruido_normal: Texture2D) -> void:
	leno = l
	_ruido = ruido
	_ruido_normal = ruido_normal
	# Física tranquila: sin rebote y muy amortiguada, para que no parezca un ragdoll.
	linear_damp = 0.25
	angular_damp = 7.0
	continuous_cd = true
	collision_layer = 1
	collision_mask = 3
	var fisica := PhysicsMaterial.new()
	fisica.friction = 0.95
	fisica.bounce = 0.02
	physics_material_override = fisica
	_forma = CylinderShape3D.new()
	var colision := CollisionShape3D.new()
	colision.shape = _forma
	add_child(colision)
	_mesh = MeshInstance3D.new()
	add_child(_mesh)
	_mat_codigo = ShaderMaterial.new()
	_mat_codigo.shader = preload("res://shaders/madera.gdshader")
	_mat_codigo.set_shader_parameter("semilla", randf())
	_mat_codigo.set_shader_parameter("ruido", ruido)
	_mat_codigo.set_shader_parameter("ruido_normal", ruido_normal)
	armar()


# Forma y material de su madera actual. Se vuelve a llamar cuando la pieza pasa al corte de abajo.
func armar() -> void:
	var w := leno.madera
	var radio: float = w.radio * randf_range(0.92, 1.1)
	var largo: float = w.largo * randf_range(0.9, 1.08)
	if _modelo:
		_modelo.queue_free()
		_modelo = null
	var modelos: Array = w.get("modelos", [])
	var datos := Modelos.lena(modelos.pick_random()) if not modelos.is_empty() else {}
	if not datos.is_empty():
		largo = _armar_modelo(datos, radio, largo)
	mass = PI * radio * radio * largo * 600.0
	_forma.radius = radio
	_forma.height = largo
	if _llamas:
		_llamas.queue_free()
		_llamas = null
	sleeping = false
	if _modelo:
		_mesh.mesh = null
		return
	_material = _mat_codigo
	var cilindro := CylinderMesh.new()
	cilindro.top_radius = radio * (0.25 if w.cono else randf_range(0.82, 1.0))
	cilindro.bottom_radius = radio
	cilindro.height = largo
	cilindro.radial_segments = 14
	cilindro.rings = 3
	cilindro.material = _material
	_mesh.mesh = cilindro
	_material.set_shader_parameter("color_base", w.color)
	_material.set_shader_parameter("radio", radio)


# Pone el modelo con su eje largo vertical (el eje del cilindro de colisión) y lo escala al grosor del corte.
# Devuelve el largo con que quedó.
func _armar_modelo(datos: Dictionary, radio: float, largo: float) -> float:
	var caja: AABB = datos.aabb
	var s := caja.size
	var eje := 0 if s.x >= s.y and s.x >= s.z else (1 if s.y >= s.z else 2)
	var giro := Basis()
	if eje == 0:
		giro = Basis(Vector3.BACK, PI * 0.5)
	elif eje == 2:
		giro = Basis(Vector3.RIGHT, PI * 0.5)
	var grueso := 0.0
	for i in 3:
		if i != eje:
			grueso = maxf(grueso, s[i])
	var k_grosor := 2.0 * radio * 1.1 / maxf(0.001, grueso)
	var k_largo := clampf(largo / maxf(0.001, s[eje]), k_grosor * 0.8, k_grosor * ESTIRA_MAXIMO)
	var esc := Vector3.ONE * k_grosor
	esc[eje] = k_largo
	var base := (giro * Basis.from_scale(esc)).rotated(Vector3.UP, randf() * TAU)
	if _mat_modelo == null:
		_mat_modelo = ShaderMaterial.new()
		_mat_modelo.shader = preload("res://shaders/madera_modelo.gdshader")
		_mat_modelo.set_shader_parameter("semilla", randf())
		_mat_modelo.set_shader_parameter("ruido", _ruido)
	for par: Array in [["tex_color", "BaseColor"], ["tex_normal", "Normal"], ["tex_rugosidad", "Roughness"], ["tex_ao", "AO"]]:
		_mat_modelo.set_shader_parameter(par[0], datos[par[1]])
	var c: Color = leno.madera.color
	_mat_modelo.set_shader_parameter("tinte", Vector3(
		clampf(c.r / COLOR_MODELO.r, 0.35, 1.6), clampf(c.g / COLOR_MODELO.g, 0.35, 1.6), clampf(c.b / COLOR_MODELO.b, 0.35, 1.6)))
	_material = _mat_modelo
	_modelo = MeshInstance3D.new()
	_modelo.mesh = datos.mesh
	_modelo.material_override = _mat_modelo
	_modelo.transform = Transform3D(base, -(base * caja.get_center()))
	_mesh.add_child(_modelo)
	return s[eje] * k_largo


func caer() -> void:
	contact_monitor = true
	max_contacts_reported = 1
	body_entered.connect(_al_tocar, CONNECT_ONE_SHOT)


func _al_tocar(_cuerpo: Node) -> void:
	set_deferred("contact_monitor", false)
	aterrizo.emit(self, _vel_previa)


func _physics_process(delta: float) -> void:
	if sleeping:
		return
	_vel_previa = linear_velocity.length()
	# Una pieza casi quieta se duerme: la pila se calma en vez de temblar o reptar.
	if linear_velocity.length() < QUIETA_LINEAL and angular_velocity.length() < QUIETA_ANGULAR:
		_tiempo_quieta += delta
		if _tiempo_quieta >= SEGUNDOS_PARA_CALMARSE:
			sleeping = true
			_tiempo_quieta = 0.0
	else:
		_tiempo_quieta = 0.0


func _process(_delta: float) -> void:
	if leno == null:
		return
	leno.pos = global_position
	var avance := 1.0 - maxf(0.0, leno.combustible) / leno.combustible_max
	var quemado := 0.0
	if leno.ardiendo():
		quemado = clampf(avance * 1.5 + 0.12, 0.0, 1.0)
	else:
		quemado = clampf(leno.temp / maxf(0.2, leno.madera.prende) - 0.4, 0.0, 0.3)
	_material.set_shader_parameter("quemado", quemado)
	_material.set_shader_parameter("brasa", leno.brasa if leno.estado == "brasas" else clampf(leno.llama * 0.5, 0.0, 1.0))
	# Al quemarse se afina y se acorta; en brasas se cubre de ceniza hasta quedar gris.
	var grosor := lerpf(1.0, 0.5, avance) if leno.ardiendo() else 1.0
	var largo := lerpf(1.0, 0.72, avance) if leno.ardiendo() else 1.0
	_mesh.scale = Vector3(grosor, largo, grosor)
	var ceniza := 0.0
	if leno.estado == "brasas":
		ceniza = clampf(1.0 - leno.combustible / (leno.combustible_max * Fuego.BRASAS_DESDE), 0.0, 1.0) * 0.92
	_material.set_shader_parameter("ceniza", ceniza)
	if leno.llama > 0.03 and _llamas == null:
		_crear_llamas()
	if _llamas:
		_llamas.emitting = leno.llama > 0.03
		_llamas.amount_ratio = clampf(leno.llama, 0.15, 1.0)


func _crear_llamas() -> void:
	var w := leno.madera
	_llamas = GPUParticles3D.new()
	_llamas.amount = int(4 + w.radio * 80.0)
	_llamas.lifetime = 0.55 + w.radio * 3.0
	_llamas.local_coords = false
	_llamas.visibility_aabb = AABB(Vector3(-3, -2, -3), Vector3(6, 6, 6))
	var p := ParticleProcessMaterial.new()
	p.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	p.emission_box_extents = Vector3(_forma.radius, _forma.height * 0.46, _forma.radius)
	p.direction = Vector3.UP
	p.spread = 8.0
	p.initial_velocity_min = 0.08
	p.initial_velocity_max = 0.22
	p.gravity = Vector3(0.0, 0.3, 0.0)
	var tam: float = 0.17 + w.radio * 3.2
	p.scale_min = tam * 0.7
	p.scale_max = tam * 1.25
	var curva := Curve.new()
	curva.add_point(Vector2(0.0, 0.55))
	curva.add_point(Vector2(0.35, 1.0))
	curva.add_point(Vector2(1.0, 0.45))
	var curva_tex := CurveTexture.new()
	curva_tex.curve = curva
	p.scale_curve = curva_tex
	var gradiente := Gradient.new()
	gradiente.offsets = PackedFloat32Array([0.0, 0.25, 0.65, 1.0])
	gradiente.colors = PackedColorArray([Color(1, 1, 1, 0.0), Color(1, 1, 1, 0.5), Color(1, 1, 1, 0.38), Color(1, 1, 1, 0.0)])
	var gradiente_tex := GradientTexture1D.new()
	gradiente_tex.gradient = gradiente
	p.color_ramp = gradiente_tex
	_llamas.process_material = p
	var cuadro := QuadMesh.new()
	cuadro.size = Vector2(0.62, 1.0)
	cuadro.center_offset = Vector3(0.0, 0.5, 0.0)
	cuadro.material = _material_llama(leno.pozo.spec().llama)
	_llamas.draw_pass_1 = cuadro
	add_child(_llamas)


# Un material por paleta de fuego (datos/llamas.gd), así se agrupan al dibujar.
func _material_llama(paleta: String) -> ShaderMaterial:
	if _materiales_llama.has(paleta):
		return _materiales_llama[paleta]
	var m := ShaderMaterial.new()
	m.shader = preload("res://shaders/llama.gdshader")
	m.set_shader_parameter("ruido", _ruido)
	var c: Dictionary = Llamas.TODAS[paleta]
	for k: String in ["borde", "medio", "centro"]:
		m.set_shader_parameter(k, Vector3(c[k].r, c[k].g, c[k].b))
	_materiales_llama[paleta] = m
	return m
