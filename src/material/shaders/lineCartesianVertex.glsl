#define PI 3.14159265358979323846
attribute float lineWidth;
attribute float lineMiter;
attribute vec2 lineNormal;
attribute vec3 vertexColor;
uniform vec3 anchor;
varying vec3 vColor;

uniform mat4 translateMatrix;
uniform mat4 worldMatrix;
uniform float worldWidth;

void main() {
	vColor = vertexColor;

	vec3 projected = vec3(40075000.0 * position.x / 180.0, 40075000.0 * log(tan(PI/4.0 + radians(position.y)/4.0)), 0);
	vec3 pointPos = projected.xyz + vec3(lineNormal * lineWidth / 2.0 * lineMiter, 0.0);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(pointPos, 1.0);

}