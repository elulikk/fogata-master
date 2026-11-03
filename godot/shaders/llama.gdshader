shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, shadows_disabled;

// Una lengua de fuego parada: mira a la cámara girando solo en vertical, y el ruido la ondula y la deshace.
uniform sampler2D ruido : repeat_enable, filter_linear_mipmap;
uniform vec3 borde = vec3(1.1, 0.16, 0.015);
uniform vec3 medio = vec3(1.5, 0.42, 0.05);
uniform vec3 centro = vec3(1.7, 0.85, 0.22);

varying float semilla;

void vertex() {
	semilla = fract(float(INSTANCE_ID) * 0.137);
	vec3 arriba = vec3(0.0, 1.0, 0.0);
	vec3 costado = normalize(cross(arriba, INV_VIEW_MATRIX[2].xyz));
	vec3 frente = cross(costado, arriba);
	float escala = length(MODEL_MATRIX[0].xyz);
	mat4 mundo = mat4(vec4(costado * escala, 0.0), vec4(arriba * escala, 0.0), vec4(frente * escala, 0.0), MODEL_MATRIX[3]);
	MODELVIEW_MATRIX = VIEW_MATRIX * mundo;
}

void fragment() {
	float y = 1.0 - UV.y;
	float ondeo = texture(ruido, vec2(UV.x * 0.25 + semilla, y * 0.3 - TIME * 0.42 + semilla)).r;
	float x = (UV.x - 0.5) * 2.0 + (ondeo - 0.5) * 1.5 * y;

	float ancho = pow(max(1.0 - y, 0.0), 0.8) * smoothstep(0.0, 0.14, y) * 0.72;
	float cuerpo = 1.0 - smoothstep(0.25, 1.0, abs(x) / max(ancho, 0.001));

	float detalle = texture(ruido, vec2(UV.x * 0.55 + semilla * 3.0, y * 0.5 - TIME * 0.85)).r;
	float forma = cuerpo * smoothstep(0.1 + y * 0.5, 0.42 + y * 0.5, detalle + 0.28);

	vec3 color = mix(borde, medio, smoothstep(0.08, 0.5, forma));
	color = mix(color, centro, smoothstep(0.5, 0.95, forma) * (1.0 - y * 0.75));

	ALBEDO = color * COLOR.rgb;
	ALPHA = forma * COLOR.a;
}
