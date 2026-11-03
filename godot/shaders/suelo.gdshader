shader_type spatial;

// Tierra y pasto ralo. La franja de las fogatas queda plana y las lomas empiezan más lejos.
uniform sampler2D ruido : repeat_enable, filter_linear_mipmap;
uniform sampler2D ruido_normal : hint_normal, repeat_enable, filter_linear_mipmap;

varying vec3 pos_mundo;

void vertex() {
	pos_mundo = VERTEX;
	float d = length(VERTEX.xz * vec2(0.7, 1.0));
	float lomas = texture(ruido, VERTEX.xz * 0.035).r - 0.5;
	VERTEX.y += lomas * 2.4 * smoothstep(6.0, 14.0, d);
}

void fragment() {
	vec2 p = pos_mundo.xz;
	float mancha = texture(ruido, p * 0.11).r;
	float grano = texture(ruido, p * 0.9).r;
	vec3 tierra = mix(vec3(0.075, 0.055, 0.04), vec3(0.14, 0.10, 0.065), grano);
	vec3 pasto = mix(vec3(0.035, 0.065, 0.025), vec3(0.075, 0.105, 0.04), grano);
	ALBEDO = mix(tierra, pasto, smoothstep(0.42, 0.62, mancha) * smoothstep(1.2, 3.0, abs(p.y)));
	ROUGHNESS = 0.97;
	NORMAL_MAP = texture(ruido_normal, p * 0.7).rgb;
	NORMAL_MAP_DEPTH = 1.1;
}
