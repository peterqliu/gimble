uniform float opacity;
varying vec3 vColor;
uniform vec3 lineColor;

void main() {

	vColor;
	
	#ifdef USE_COLOR
		gl_FragColor = vec4(vColor, opacity);
	
	#else
		gl_FragColor = vec4(lineColor, 1.0);
	#endif
}