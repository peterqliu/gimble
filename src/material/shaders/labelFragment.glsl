#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
uniform float opacity;
uniform sampler2D map;

varying vec2 vUv;
varying vec3 vColor;


float median(float r, float g, float b) {
	return max(min(r, g), min(max(r, g), b));
}

void main() {

	vec3 sample = 1.0 - texture2D(map, vUv).rgb;
	float sigDist = median(sample.r, sample.g, sample.b) - 0.5;
	float alpha = clamp(sigDist, -1.0, 1.0);

	gl_FragColor = vec4(vColor, alpha * opacity);
	if (alpha < 0.00001) discard;
}