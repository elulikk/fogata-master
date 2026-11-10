shader_type spatial;

// Leña de un modelo con texturas (Quixel): se tiñe según la especie y se quema igual que la de código:
// carbón por manchas, grietas al rojo y ceniza gris encima.
uniform sampler2D tex_color : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_normal : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_rugosidad : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D tex_ao : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec3 tinte = vec3(1.0);
uniform float quemado : hint_range(0.0, 1.0) = 0.0;
uniform float brasa : hint_range(0.0, 1.0) = 0.0;
uniform float ceniza : hint_range(0.0, 1.0) = 0.0;
uniform float semilla = 0.0;
uniform sampler2D ruido : repeat_enable, filter_linear_mipmap;

void fragment() {
	vec3 color = texture(tex_color, UV).rgb * tinte;
	float veta = texture(ruido, UV * 1.3 + semilla).r;
	float fina = texture(ruido, UV * 5.0 + semilla * 1.7).r;
	NORMAL_MAP = texture(tex_normal, UV).rgb;
	AO = texture(tex_ao, UV).r;
	AO_LIGHT_AFFECT = 0.4;

	float carbon = smoothstep(veta * 0.55, veta * 0.55 + 0.32, quemado);
	ALBEDO = mix(color, vec3(0.018, 0.015, 0.014), carbon);
	ROUGHNESS = mix(texture(tex_rugosidad, UV).r, 0.97, carbon);
	SPECULAR = 0.25;

	float grietas = smoothstep(0.42, 0.58, fina) * (1.0 - smoothstep(0.58, 0.72, fina));
	float latido = 0.72 + 0.28 * sin(TIME * 2.3 + semilla * 40.0 + veta * 11.0);
	EMISSION = vec3(2.2, 0.48, 0.05) * grietas * carbon * brasa * latido;
	EMISSION += vec3(1.9, 0.36, 0.04) * carbon * brasa * 0.28 * latido * (0.6 + 0.4 * fina);

	float cubre = smoothstep(veta * 0.5, veta * 0.5 + 0.3, ceniza);
	vec3 gris = vec3(0.6, 0.58, 0.56) * mix(0.7, 1.1, fina);
	ALBEDO = mix(ALBEDO, gris, cubre);
	ROUGHNESS = mix(ROUGHNESS, 1.0, cubre);
	EMISSION *= 1.0 - cubre;
}
