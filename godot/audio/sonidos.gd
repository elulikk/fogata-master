class_name Sonidos
extends Node
# Todo el sonido se genera por código al arrancar, sin archivos. Para sumar uno alcanza con una receta.
# Cada capa: ruido o tono; f/f2: frecuencia inicial y final; ataque, caida: segundos; vol; t: retardo.

const HZ := 22050
const RECETAS := {
	"chasquido": [{"ruido": true, "f": 5200.0, "caida": 0.035, "vol": 0.5}],
	"prende": [{"ruido": true, "f": 900.0, "f2": 2800.0, "ataque": 0.04, "caida": 0.3, "vol": 0.55}],
	"fosforo": [{"ruido": true, "f": 4200.0, "f2": 1800.0, "ataque": 0.01, "caida": 0.22, "vol": 0.5}],
	"pedernal": [{"ruido": true, "f": 6500.0, "caida": 0.05, "vol": 0.55}, {"f": 2600.0, "f2": 1800.0, "caida": 0.05, "vol": 0.15}],
	"golpe": [{"f": 140.0, "f2": 70.0, "caida": 0.12, "vol": 0.7}, {"ruido": true, "f": 1200.0, "caida": 0.05, "vol": 0.3}],
	"rechazo": [{"f": 210.0, "f2": 150.0, "caida": 0.16, "vol": 0.4}],
	"soplo": [{"ruido": true, "f": 700.0, "f2": 1500.0, "ataque": 0.06, "caida": 0.3, "vol": 0.5}],
	"sise": [{"ruido": true, "f": 6000.0, "f2": 3000.0, "ataque": 0.02, "caida": 0.55, "vol": 0.35}],
	"ceniza": [{"ruido": true, "f": 1500.0, "f2": 500.0, "ataque": 0.01, "caida": 0.3, "vol": 0.35}],
	"moneda": [{"f": 1300.0, "f2": 1700.0, "caida": 0.09, "vol": 0.3}],
	"compra": [{"f": 660.0, "caida": 0.09, "vol": 0.35}, {"f": 990.0, "caida": 0.14, "vol": 0.35, "t": 0.07}],
	"click": [{"f": 900.0, "f2": 700.0, "caida": 0.04, "vol": 0.3}],
	"hito": [{"f": 523.0, "caida": 0.16, "vol": 0.3}, {"f": 659.0, "caida": 0.16, "vol": 0.3, "t": 0.1}, {"f": 784.0, "caida": 0.28, "vol": 0.3, "t": 0.2}],
	"nivel": [{"f": 587.0, "caida": 0.14, "vol": 0.3}, {"f": 880.0, "caida": 0.14, "vol": 0.3, "t": 0.1}, {"f": 1175.0, "caida": 0.35, "vol": 0.3, "t": 0.2}],
	"logro": [{"f": 784.0, "caida": 0.14, "vol": 0.28}, {"f": 1047.0, "caida": 0.14, "vol": 0.28, "t": 0.11}, {"f": 1319.0, "caida": 0.4, "vol": 0.28, "t": 0.22}],
	"agrandar": [{"f": 70.0, "f2": 45.0, "caida": 0.7, "vol": 0.8}, {"ruido": true, "f": 500.0, "f2": 200.0, "caida": 0.6, "vol": 0.4}],
	"amanecer": [{"f": 392.0, "ataque": 0.25, "caida": 0.8, "vol": 0.22}, {"f": 587.0, "ataque": 0.25, "caida": 0.9, "vol": 0.2, "t": 0.2}, {"f": 784.0, "ataque": 0.25, "caida": 1.0, "vol": 0.18, "t": 0.4}],
	"trueno": [{"ruido": true, "f": 220.0, "f2": 60.0, "ataque": 0.04, "caida": 1.8, "vol": 0.8}],
}
# Bucles de ruido: f es el corte del filtro.
const BUCLES := {"fuego": 900.0, "lluvia": 3800.0, "viento": 320.0}

var _sonidos := {}
var _jugadores: Array[AudioStreamPlayer] = []
var _bucles := {}
var _ultimo := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for nombre: String in RECETAS:
		_sonidos[nombre] = _renderizar(RECETAS[nombre])
	for nombre: String in BUCLES:
		var j := AudioStreamPlayer.new()
		j.stream = _bucle(BUCLES[nombre])
		j.volume_db = -80.0
		add_child(j)
		j.play()
		_bucles[nombre] = j
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
		for i in total:
			var s := float(i) / HZ
			var env := minf(1.0, s / ataque) * exp(-4.0 * maxf(0.0, s - ataque) / c.caida)
			var f: float = lerpf(c.f, c.get("f2", c.f), float(i) / total)
			var v := 0.0
			if c.get("ruido", false):
				filtro += (randf_range(-1.0, 1.0) - filtro) * minf(1.0, TAU * f / HZ)
				v = filtro * 1.6
			else:
				fase += TAU * f / HZ
				v = sin(fase)
			muestras[inicio + i] += v * env * c.vol
	return _a_wav(muestras, false)


# Ruido filtrado con cruce en la unión, para que el bucle no haga clic.
func _bucle(corte: float) -> AudioStreamWAV:
	var n := HZ * 3
	var cruce := HZ / 4
	var crudo := PackedFloat32Array()
	crudo.resize(n + cruce)
	var filtro := 0.0
	for i in n + cruce:
		filtro += (randf_range(-1.0, 1.0) - filtro) * minf(1.0, TAU * corte / HZ)
		crudo[i] = filtro * 2.0
	var m := PackedFloat32Array()
	m.resize(n)
	for i in n:
		m[i] = crudo[i]
	for i in cruce:
		var k := float(i) / cruce
		m[i] = crudo[n + i] * (1.0 - k) + crudo[i] * k
	return _a_wav(m, true)


# espera: milisegundos mínimos entre dos del mismo, para que no se amontonen.
func tocar(nombre: String, vol := 1.0, tono := 1.0, espera := 30) -> void:
	var ahora := Time.get_ticks_msec()
	if ahora - _ultimo.get(nombre, -99999) < espera or not _sonidos.has(nombre):
		return
	_ultimo[nombre] = ahora
	for j in _jugadores:
		if not j.playing:
			j.stream = _sonidos[nombre]
			j.volume_db = linear_to_db(maxf(0.001, vol))
			j.pitch_scale = tono
			j.play()
			return


func ambiente(intensidad: float, lluvia: float, viento: float) -> void:
	_nivel("fuego", clampf(intensidad, 0.0, 1.3) * 0.55)
	_nivel("lluvia", lluvia * 0.4)
	_nivel("viento", viento * 0.5)


func _nivel(nombre: String, v: float) -> void:
	_bucles[nombre].volume_db = linear_to_db(maxf(0.0001, v))


func ajustes(volumen: float, mudo: bool) -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(0.0001, volumen)))
	AudioServer.set_bus_mute(0, mudo)
