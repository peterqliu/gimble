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

	float totalScaleFactor = radius + strokeWidth;

	// determine threshold at which core ends and stroke begins
	vCoreRatio = radius / totalScaleFactor;

	float inverseZoomScale = pow(2.0, 22.0 - zoom) / viewportSize.y;

	// non-zoomscaled means applying opposite scale factor to keep circle size constant
	float zoomScale = zoomScaled == 0 ?  1.0 : inverseZoomScale;


	vAAFraction = 25.0 * zoomScale / totalScaleFactor;
	// vAAFraction = antialiasAmount;

	if (zoomScaled == 0) totalScaleFactor = totalScaleFactor * inverseZoomScale;

	// increase scale slightly to account for antialiased blurring
	totalScaleFactor *= (1.0 + vAAFraction);

	// assumes use with InstanceMesh only! (includes instanceMatrix)
	gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * billboardMatrix * vec4(position.xyz * totalScaleFactor, 1.0);

}