shader_type spatial;

// Disco de ceniza bajo la leña, con brasas que laten según el calor del pozo.
uniform float calor : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D ruido : repeat_enable, filter_linear_mipmap;

varying vec3 pos_local;

void vertex() {
	pos_local = VERTEX;
}

void fragment() {
	vec2 p = pos_local.xz;
	float d = length(UV - vec2(0.5)) * 2.0;
	float grano = texture(ruido, p * 0.9).r;
	ALBEDO = mix(vec3(0.03), vec3(0.17, 0.16, 0.15), grano * grano);
	ROUGHNESS = 1.0;
	ALPHA = 1.0 - smoothstep(0.72, 1.0, d + (grano - 0.5) * 0.35);
	float puntos = smoothstep(0.72, 0.84, texture(ruido, p * 5.0).r);
	float latido = 0.65 + 0.35 * sin(TIME * 1.7 + grano * 30.0);
	EMISSION = vec3(1.6, 0.3, 0.03) * puntos * calor * latido;
}
