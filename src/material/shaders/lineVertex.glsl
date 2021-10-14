attribute float lineWidth;
attribute float lineMiter;

attribute vec2 lineNormal;
// varying float edge;

varying vec3 vColor;

uniform vec2 viewportSize;
uniform float pixelRatio;

uniform float zoom;


uniform float now;
uniform float animateUntil;

uniform mat4 cameraStartMatrix;

uniform mat4 worldMatrix;
uniform mat4 worldStartMatrix;
uniform float worldAnimationDuration;
uniform float worldAnimationStartTime;

uniform float startTime;
uniform float duration;
uniform mat4 startMatrix;
uniform mat4 endMatrix;




void main() {

	#ifdef USE_COLOR
	// varying vec3 vColor;

	vColor = color;
	#endif
	// edge = sign(lineMiter);

	float zoomScale = pow(2.0, 22.0 - zoom) / (viewportSize.y / pixelRatio);
	vec3 pointPos = position.xyz + vec3(lineNormal * zoomScale * lineWidth / 2.0 * lineMiter, 0.0);
	
	float worldAnimationProgress = clamp(now - worldAnimationStartTime, 0.0, worldAnimationDuration) / worldAnimationDuration; 
	mat4 cameraAnimationMatrix = (cameraStartMatrix * (1.0 - worldAnimationProgress)) + (viewMatrix * worldAnimationProgress);

	// if no animations are happening, use built-in `modelMatrix` to position object statically
	if (now >= startTime + duration) 
		gl_Position = projectionMatrix * cameraAnimationMatrix * modelMatrix * vec4(pointPos, 1.0);
	

	// if something is animating, interpolate world and model matrices as appropriate
	else {
		
		float progress = clamp(now - startTime, 0.0, duration) / duration;

		mat4 worldAnimationMatrix = (worldStartMatrix * (1.0 - worldAnimationProgress)) + (worldMatrix * worldAnimationProgress);
		mat4 modelAnimationMatrix = (startMatrix * (1.0 - progress)) + (endMatrix * progress);
		
		gl_Position = projectionMatrix * cameraAnimationMatrix * worldAnimationMatrix * modelAnimationMatrix * vec4(pointPos, 1.0);

	}
}