uniform float blur;

uniform vec2 viewportSize;
uniform float zoom;
uniform mat4 billboardMatrix;

varying float vCoreRatio;
varying vec3 vStrokeColor;

varying vec3 vPos;
varying vec3 vColor;
varying float vBlur;
varying float vOpacity;

varying float vAAFraction;

void main() {

	vColor = vec3(instanceMatrix[0][1], instanceMatrix[1][1], instanceMatrix[2][1]);
	vStrokeColor = vec3(instanceMatrix[0][2], instanceMatrix[1][2], instanceMatrix[2][2]);

	vBlur = blur;
	vPos = position;
	vOpacity = instanceMatrix[2][0];
	float zoomScale = instanceMatrix[1][3];

	float radius = instanceMatrix[0][0];
	float strokeWidth = instanceMatrix[1][0];
	float totalRadius = radius + strokeWidth;

	// determine threshold at which core ends and stroke begins
	vCoreRatio = radius / totalRadius;


	float inverseZoomScale = pow(zoomScale/2.0, zoom);

	// if scaled independently of zoom, apply compensatory scaling to keep circles at constant size
	totalRadius *=inverseZoomScale;

	// scale antialiasfraction with zoom and camera distance 
	// (which is really about world width), divided by the whole size of circle
	float cameraDistance = - viewMatrix[3][2];
	vAAFraction = pow(0.5, zoom) * (cameraDistance / 1000.0) / totalRadius;


	// increase scale slightly to account for antialiased blurring
	totalRadius *= 1.0 + vAAFraction;

	// extract translation from instanceMatrix
	mat4 instanceTranslateMatrix = mat4(1.0);
	instanceTranslateMatrix[3] = instanceMatrix[3];

	mat4 rotationMatrix = instanceMatrix[0][3] == 1.0 ? billboardMatrix : mat4(1.0);

	gl_Position = projectionMatrix * modelViewMatrix * instanceTranslateMatrix * rotationMatrix * vec4(position.xyz * totalRadius, 1.0);

}