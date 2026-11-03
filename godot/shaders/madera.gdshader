shader_type spatial;

// Corteza por código para un cilindro de eje Y: anillos en las tapas, carbón y brasas al quemarse.
uniform vec3 color_base = vec3(0.36, 0.25, 0.16);
uniform float quemado : hint_range(0.0, 1.0) = 0.0;
uniform float brasa : hint_range(0.0, 1.0) = 0.0;
uniform float radio = 0.05;
uniform float semilla = 0.0;
uniform sampler2D ruido : repeat_enable, filter_linear_mipmap;
uniform sampler2D ruido_normal : hint_normal, repeat_enable, filter_linear_mipmap;

varying vec3 pos_local;
varying vec3 normal_local;

void vertex() {
	pos_local = VERTEX;
	normal_local = NORMAL;
}

void fragment() {
	bool tapa = abs(normal_local.y) > 0.7;
	float r = length(pos_local.xz) / radio;
	float angulo = atan(pos_local.z, pos_local.x) / 6.28318;
	vec2 uv_corteza = vec2(angulo * 3.0 + semilla, pos_local.y * 0.7 + semilla * 0.37);

	float veta = texture(ruido, uv_corteza).r;
	float fina = texture(ruido, uv_corteza * vec2(3.0, 4.0)).r;
	vec3 color;
	if (tapa) {
		float ondulado = texture(ruido, pos_local.xz * 1.4 + semilla).r;
		veta = ondulado;
		fina = texture(ruido, pos_local.xz * 4.0 + semilla).r;
		float anillos = sin((r + ondulado * 0.35) * 34.0) * 0.5 + 0.5;
		color = mix(vec3(0.62, 0.47, 0.30), vec3(0.42, 0.29, 0.17), anillos);
		color = mix(color, color_base * 0.55, smoothstep(0.86, 1.0, r));
	} else {
		float surcos = smoothstep(0.34, 0.62, veta);
		color = color_base * mix(0.32, 1.25, surcos) * mix(0.8, 1.15, fina);
		NORMAL_MAP = texture(ruido_normal, uv_corteza).rgb;
		NORMAL_MAP_DEPTH = 1.6;
	}

	// El carbón avanza con manchas de ruido, no de golpe.
	float carbon = smoothstep(veta * 0.55, veta * 0.55 + 0.32, quemado);
	ALBEDO = mix(color, vec3(0.018, 0.015, 0.014), carbon);
	ROUGHNESS = mix(0.86, 0.97, carbon);
	SPECULAR = 0.22;

	// Las grietas del carbón brillan y laten con el fuego.
	float grietas = smoothstep(0.42, 0.58, fina) * (1.0 - smoothstep(0.58, 0.72, fina));
	float latido = 0.72 + 0.28 * sin(TIME * 2.3 + semilla * 40.0 + veta * 11.0);
	EMISSION = vec3(2.2, 0.48, 0.05) * grietas * carbon * brasa * latido;
}
