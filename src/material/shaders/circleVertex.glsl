uniform float radius;
uniform float opacity;
uniform float strokeWidth;
uniform vec3 strokeColor;
uniform float blur;

uniform vec2 viewportSize;
uniform float zoom;

uniform mat4 billboardMatrix;
uniform int zoomScaled;

varying float vCoreRatio;
varying vec3 vStrokeColor;

varying vec3 vPos;
varying vec3 vColor;
varying float vBlur;
varying float vOpacity;

varying float vAAFraction;

void main() {

	vColor = instanceColor;
	vStrokeColor = strokeColor;
	vBlur = blur;
	vPos = position;
	vOpacity = opacity;

	float totalRadius = radius + strokeWidth;

	// determine threshold at which core ends and stroke begins
	vCoreRatio = radius / totalRadius;

	float inverseZoomScale = pow(2.0, 22.0 - zoom) / viewportSize.y;

	// non-zoomscaled means applying opposite scale factor to keep circle size constant
	float zoomScale = zoomScaled == 0 ?  1.0 : inverseZoomScale;

	// scale antialiasfraction with zoom and camera distance (which is really about world width), divided by the whole size of circle
	vAAFraction = - (viewMatrix[3][2]/5000000.0) * zoomScale / totalRadius;

	if (zoomScaled == 0) totalRadius *= inverseZoomScale;

	// increase scale slightly to account for antialiased blurring
	totalRadius *= (1.0 + vAAFraction);

	gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * billboardMatrix * vec4(position.xyz * totalRadius, 1.0);

}