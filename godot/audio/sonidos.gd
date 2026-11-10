class_name Sonidos
extends Node
# Todo el sonido se genera por código al arrancar, sin archivos.
# El fuego busca el de un hogar tranquilo: un rumor grave que respira, chisporroteo suave y algún crujido de vez en cuando.
# Para sumar un sonido de una vez alcanza con una receta. Cada capa: ruido o tono; f/f2: frecuencia inicial y final;
# ataque, caida: segundos; vol; t: retardo. Los que tienen variantes se arman con una función y se elige uno al azar.

const HZ := 22050
const RECETAS := {
	"prende": [{"ruido": true, "f": 300.0, "f2": 1100.0, "ataque": 0.18, "caida": 0.7, "vol": 0.3}],
	"fosforo": [{"ruido": true, "f": 3000.0, "f2": 1400.0, "ataque": 0.01, "caida": 0.2, "vol": 0.25}, {"ruido": true, "f": 500.0, "f2": 900.0, "ataque": 0.08, "caida": 0.5, "vol": 0.2, "t": 0.08}],
	"golpe": [{"f": 120.0, "f2": 70.0, "caida": 0.14, "vol": 0.45}, {"ruido": true, "f": 700.0, "caida": 0.05, "vol": 0.15}],
	"rechazo": [{"f": 220.0, "f2": 180.0, "ataque": 0.01, "caida": 0.18, "vol": 0.18}],
	"soplo": [{"ruido": true, "f": 350.0, "f2": 800.0, "ataque": 0.12, "caida": 0.45, "vol": 0.35}],
	"sise": [{"ruido": true, "f": 3500.0, "f2": 2200.0, "ataque": 0.06, "caida": 0.6, "vol": 0.12}],
	"ceniza": [{"ruido": true, "f": 700.0, "f2": 300.0, "ataque": 0.03, "caida": 0.4, "vol": 0.2}],
	"rastrillo": [{"ruido": true, "f": 1200.0, "f2": 500.0, "ataque": 0.05, "caida": 0.4, "vol": 0.25}, {"ruido": true, "f": 400.0, "f2": 250.0, "caida": 0.3, "vol": 0.2, "t": 0.15}],
	"moneda": [{"f": 1046.0, "ataque": 0.006, "caida": 0.4, "vol": 0.13}, {"f": 2093.0, "ataque": 0.004, "caida": 0.18, "vol": 0.04}],
	"compra": [{"f": 523.0, "ataque": 0.01, "caida": 0.3, "vol": 0.16}, {"f": 784.0, "ataque": 0.01, "caida": 0.4, "vol": 0.14, "t": 0.09}],
	"click": [{"f": 700.0, "f2": 600.0, "ataque": 0.003, "caida": 0.05, "vol": 0.12}],
	"hito": [{"f": 523.0, "ataque": 0.02, "caida": 0.5, "vol": 0.13}, {"f": 659.0, "ataque": 0.02, "caida": 0.5, "vol": 0.12, "t": 0.14}, {"f": 784.0, "ataque": 0.02, "caida": 0.8, "vol": 0.12, "t": 0.28}],
	"nivel": [{"f": 587.0, "ataque": 0.02, "caida": 0.5, "vol": 0.13}, {"f": 880.0, "ataque": 0.02, "caida": 0.5, "vol": 0.12, "t": 0.13}, {"f": 1175.0, "ataque": 0.02, "caida": 0.9, "vol": 0.11, "t": 0.26}],
	"logro": [{"f": 784.0, "ataque": 0.02, "caida": 0.5, "vol": 0.12}, {"f": 1047.0, "ataque": 0.02, "caida": 0.5, "vol": 0.11, "t": 0.13}, {"f": 1319.0, "ataque": 0.02, "caida": 0.9, "vol": 0.1, "t": 0.26}],
	"agrandar": [{"f": 70.0, "f2": 50.0, "ataque": 0.03, "caida": 0.8, "vol": 0.45}, {"ruido": true, "f": 400.0, "f2": 200.0, "caida": 0.6, "vol": 0.2}],
	"amanecer": [{"f": 392.0, "ataque": 0.4, "caida": 1.2, "vol": 0.12}, {"f": 587.0, "ataque": 0.4, "caida": 1.3, "vol": 0.1, "t": 0.3}, {"f": 784.0, "ataque": 0.4, "caida": 1.5, "vol": 0.09, "t": 0.6}],
	"trueno": [{"ruido": true, "f": 180.0, "f2": 50.0, "ataque": 0.1, "caida": 2.2, "vol": 0.6}],
}
const VARIANTES := 6 # cuántas versiones distintas de cada sonido con variantes
# Bucles de fondo. Los del fuego se mezclan según la intensidad: el rumor siempre, el chisporroteo crece con el fuego.
const LARGO_BUCLE := 12.0
const REVERB := {"room_size": 0.35, "damping": 0.75, "wet": 0.09, "dry": 1.0}

var _sonidos := {} # nombre -> Array de AudioStreamWAV
var _jugadores: Array[AudioStreamPlayer] = []
var _bucles := {}
var _niveles := {}
var _ultimo := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var reverb := AudioEffectReverb.new()
	for k: String in REVERB:
		reverb.set(k, REVERB[k])
	AudioServer.add_bus_effect(0, reverb)
	for nombre: String in RECETAS:
		_sonidos[nombre] = [_renderizar(RECETAS[nombre])]
	_sonidos["chasquido"] = []
	_sonidos["pedernal"] = []
	for i in VARIANTES:
		_sonidos.chasquido.append(_un_chasquido())
		_sonidos.pedernal.append(_un_pedernal())
	var bucles := {"fuego": _bucle_rumor(), "crepita": _bucle_crepita(), "lluvia": _bucle_ruido(2600.0, 0.6), "viento": _bucle_viento()}
	for nombre: String in bucles:
		var j := AudioStreamPlayer.new()
		j.stream = bucles[nombre]
		j.volume_db = -80.0
		add_child(j)
		j.play(randf() * LARGO_BUCLE)
		_bucles[nombre] = j
		_niveles[nombre] = 0.0
	for i in 14:
		var j := AudioStreamPlayer.new()
		add_child(j)
		_jugadores.append(j)


func _a_wav(muestras: PackedFloat32Array, con_bucle: bool) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(muestras.size() * 2)
	for i in muestras.size():
		bytes.encode_s16(i * 2, int(clampf(muestras[i], -1.0, 1.0) * 32000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = HZ
	w.data = bytes
	if con_bucle:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_end = muestras.size()
	return w


func _renderizar(capas: Array) -> AudioStreamWAV:
	var largo := 0.0
	for c: Dictionary in capas:
		largo = maxf(largo, c.get("t", 0.0) + c.get("ataque", 0.002) + c.caida)
	var muestras := PackedFloat32Array()
	muestras.resize(int(largo * HZ) + 1)
	for c: Dictionary in capas:
		var inicio := int(c.get("t", 0.0) * HZ)
		var ataque: float = maxf(0.001, c.get("ataque", 0.002))
		var total := int((ataque + c.caida) * HZ)
		var fase := 0.0
		var filtro := 0.0
		var filtro2 := 0.0
		for i in total:
			var s := float(i) / HZ
			var env := minf(1.0, s / ataque) * exp(-4.0 * maxf(0.0, s - ataque) / c.caida)
			var f: float = lerpf(c.f, c.get("f2", c.f), float(i) / total)
			var v := 0.0
			if c.get("ruido", false):
				# Dos polos: un ruido más redondo, sin el siseo de arriba.
				var a := minf(1.0, TAU * f / HZ)
				filtro += (randf_range(-1.0, 1.0) - filtro) * a
				filtro2 += (filtro - filtro2) * a
				v = filtro2 * 2.2
			else:
				fase += TAU * f / HZ
				v = sin(fase)
			muestras[inicio + i] += v * env * c.vol
	return _a_wav(muestras, false)


# --- Piezas del fuego ---

# Un resonador de dos polos excitado por un golpecito de ruido: el "tic" de la madera que se raja.
func _tic(buf: PackedFloat32Array, en: int, f: float, decae: float, vol: float) -> void:
	var r := exp(-1.0 / (decae * HZ))
	var c := 2.0 * r * cos(TAU * f / HZ)
	var y1 := 0.0
	var y2 := 0.0
	var n := mini(int(decae * HZ * 7.0), buf.size() - en)
	var ganancia := (1.0 - r) * vol * 3.0
	for i in n:
		var x := randf_range(-1.0, 1.0) if i < 6 else 0.0
		var y := x + c * y1 - r * r * y2
		y2 = y1
		y1 = y
		buf[en + i] += y * ganancia


# Un chasquido: de uno a cuatro tics muy juntos, como en un hogar de verdad.
func _crepitar(buf: PackedFloat32Array, en: int, fuerza: float, grave := false) -> void:
	var golpes := randi_range(1, 4)
	var donde := en
	var tono := randf_range(600.0, 1300.0) if grave else randf_range(1400.0, 3800.0)
	for g in golpes:
		if donde >= buf.size():
			return
		_tic(buf, donde, tono * randf_range(0.8, 1.25), randf_range(0.006, 0.016) if grave else randf_range(0.0015, 0.005), fuerza * randf_range(0.4, 1.0))
		donde += randi_range(int(HZ * 0.002), int(HZ * 0.025))


func _un_chasquido() -> AudioStreamWAV:
	var buf := PackedFloat32Array()
	buf.resize(int(HZ * 0.15))
	_crepitar(buf, 0, 0.6, randf() < 0.3)
	return _a_wav(buf, false)


# La piedra contra el acero: un tic seco y brillante con un poquito de chirrido.
func _un_pedernal() -> AudioStreamWAV:
	var buf := PackedFloat32Array()
	buf.resize(int(HZ * 0.18))
	_tic(buf, 0, randf_range(2600.0, 3400.0), 0.004, 0.5)
	_tic(buf, int(HZ * randf_range(0.004, 0.01)), randf_range(4200.0, 5200.0), 0.003, 0.25)
	var filtro := 0.0
	for i in int(HZ * 0.06):
		filtro += (randf_range(-1.0, 1.0) - filtro) * 0.5
		buf[i] += filtro * 0.06 * exp(-float(i) / (HZ * 0.015))
	return _a_wav(buf, false)


# Valores al azar unidos con curvas suaves: sirve para que el fuego respire sin repetirse.
func _curva_lenta(n: int, cada: int) -> PackedFloat32Array:
	var puntos := PackedFloat32Array()
	for i in n / cada + 2:
		puntos.append(randf())
	var fuera := PackedFloat32Array()
	fuera.resize(n)
	for i in n:
		var k := float(i) / cada
		var a := int(k)
		var t := k - a
		t = t * t * (3.0 - 2.0 * t)
		fuera[i] = lerpf(puntos[a], puntos[mini(a + 1, puntos.size() - 1)], t)
	return fuera


# Cierra el bucle con un cruce para que no haga clic en la unión.
func _cerrar(crudo: PackedFloat32Array, n: int) -> AudioStreamWAV:
	var cruce := crudo.size() - n
	var m := crudo.slice(0, n)
	for i in cruce:
		var k := float(i) / cruce
		m[i] = crudo[n + i] * (1.0 - k) + crudo[i] * k
	return _a_wav(m, true)


# El rumor: ruido grave (marrón) que sube y baja despacio, más una capa de "llama" que titila.
func _bucle_rumor() -> AudioStreamWAV:
	var n := int(LARGO_BUCLE * HZ)
	var total := n + HZ / 2
	var respira := _curva_lenta(total, int(HZ * 0.9))
	var titila := _curva_lenta(total, int(HZ * 0.12))
	var crudo := PackedFloat32Array()
	crudo.resize(total)
	var marron := 0.0
	var grave := 0.0
	var grave2 := 0.0
	var llama := 0.0
	var llama_baja := 0.0
	var a_grave := TAU * 160.0 / HZ
	var a_llama := TAU * 900.0 / HZ
	var a_llama_baja := TAU * 280.0 / HZ
	for i in total:
		var blanco := randf_range(-1.0, 1.0)
		marron = (marron + blanco * 0.04) * 0.996
		grave += (marron - grave) * a_grave
		grave2 += (grave - grave2) * a_grave
		llama += (blanco - llama) * a_llama
		llama_baja += (llama - llama_baja) * a_llama_baja
		var cuerpo := grave2 * 3.2 * (0.65 + 0.35 * respira[i])
		var aire := (llama - llama_baja) * 0.09 * (0.3 + 0.7 * titila[i] * respira[i])
		crudo[i] = cuerpo + aire
	# Algún crujido grave suelto, muy de vez en cuando.
	var t := randf_range(0.5, 2.0)
	while t < LARGO_BUCLE - 0.2:
		_crepitar(crudo, int(t * HZ), randf_range(0.05, 0.14), true)
		t += randf_range(1.5, 4.5)
	return _cerrar(crudo, n)


# El chisporroteo: muchos tics chiquitos y suaves, y cada tanto uno más claro.
func _bucle_crepita() -> AudioStreamWAV:
	var n := int(LARGO_BUCLE * HZ)
	var crudo := PackedFloat32Array()
	crudo.resize(n + HZ / 2)
	var t := 0.05
	while t < LARGO_BUCLE - 0.1:
		var fuerte := randf() < 0.07
		_crepitar(crudo, int(t * HZ), randf_range(0.18, 0.32) if fuerte else 0.03 + 0.12 * pow(randf(), 2.5), fuerte and randf() < 0.4)
		t += -log(maxf(0.0001, randf())) * 0.11
	return _cerrar(crudo, n)


func _bucle_ruido(corte: float, vol: float) -> AudioStreamWAV:
	var n := int(LARGO_BUCLE * 0.5 * HZ)
	var crudo := PackedFloat32Array()
	crudo.resize(n + HZ / 4)
	var filtro := 0.0
	var filtro2 := 0.0
	var a := minf(1.0, TAU * corte / HZ)
	for i in crudo.size():
		filtro += (randf_range(-1.0, 1.0) - filtro) * a
		filtro2 += (filtro - filtro2) * a
		crudo[i] = filtro2 * vol * 2.0
	return _cerrar(crudo, n)


# Viento: ruido grave con ráfagas lentas.
func _bucle_viento() -> AudioStreamWAV:
	var n := int(LARGO_BUCLE * HZ)
	var total := n + HZ / 2
	var rafagas := _curva_lenta(total, int(HZ * 1.6))
	var crudo := PackedFloat32Array()
	crudo.resize(total)
	var filtro := 0.0
	var filtro2 := 0.0
	for i in total:
		var a := TAU * (180.0 + 260.0 * rafagas[i]) / HZ
		filtro += (randf_range(-1.0, 1.0) - filtro) * a
		filtro2 += (filtro - filtro2) * a
		crudo[i] = filtro2 * 2.4 * (0.35 + 0.65 * rafagas[i])
	return _cerrar(crudo, n)


# espera: milisegundos mínimos entre dos del mismo, para que no se amontonen.
func tocar(nombre: String, vol := 1.0, tono := 1.0, espera := 30) -> void:
	var ahora := Time.get_ticks_msec()
	if ahora - _ultimo.get(nombre, -99999) < espera or not _sonidos.has(nombre):
		return
	_ultimo[nombre] = ahora
	for j in _jugadores:
		if not j.playing:
			j.stream = _sonidos[nombre].pick_random()
			j.volume_db = linear_to_db(maxf(0.001, vol))
			j.pitch_scale = tono
			j.play()
			return


# Se llama en cada cuadro; los niveles se acercan de a poco para que nada entre o se corte de golpe.
func ambiente(intensidad: float, lluvia: float, viento: float) -> void:
	var i := clampf(intensidad / 1.3, 0.0, 1.0)
	_nivel("fuego", 0.0 if intensidad <= 0.01 else 0.35 + 0.45 * sqrt(i))
	_nivel("crepita", 0.6 * pow(i, 0.8))
	_nivel("lluvia", lluvia * 0.3)
	_nivel("viento", viento * 0.4)


func _nivel(nombre: String, v: float) -> void:
	_niveles[nombre] = lerpf(_niveles[nombre], v, 0.03)
	_bucles[nombre].volume_db = linear_to_db(maxf(0.0001, _niveles[nombre]))


func ajustes(volumen: float, mudo: bool) -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(0.0001, volumen)))
	AudioServer.set_bus_mute(0, mudo)
