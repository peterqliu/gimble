attribute vec2 uv;
attribute vec4 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 rotationMatrix;
varying vec2 vUv;

attribute vec3 vertexColor;
varying vec3 vColor;

void main() {
	vColor = vertexColor;
	vUv = uv;
	vec4 modelPosition = modelViewMatrix * rotationMatrix * position;
	gl_Position = projectionMatrix * modelPosition;
}