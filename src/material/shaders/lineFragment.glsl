uniform float opacity;
varying vec3 vColor;
uniform vec3 u_color;

void main() {

	gl_FragColor = vec4(vColor, opacity);

}