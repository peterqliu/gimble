varying vec3 vColor;

varying vec3 vPos;

varying float vCoreRatio;
varying float vAAFraction;
varying vec3 vStrokeColor;
varying float vBlur;
varying float vOpacity;

void main() {
	

    // fragment position, and its distance from center
    vec2 coord = vPos.xy; // u_resolution;
    float l = length(vPos.xy);

    // determine amount to blur, given a minimum antialiasing amount
	float blurFraction = max(vAAFraction, vBlur/2.0);

	// determine threshold where core starts blurring into stroke
	float startAntialias = (vCoreRatio - blurFraction)/2.0;

	// set color as continuum between core and stroke colors for antialiased area,
	// and solid for core and stroke themselves
    vec3 pxColor = mix(
    	vColor, 
    	vStrokeColor, 
    	clamp((l - startAntialias) / blurFraction, 0.0, 1.0)
    );

	float opacity = vOpacity * mix(
		1.0, 
		0.0, 
		clamp(( 2.0 * l - 1.0 + blurFraction) / blurFraction, 0.0, 1.0)
	);

    gl_FragColor = vec4( pxColor, opacity );

}