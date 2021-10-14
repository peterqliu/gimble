// given a LngLat attribute, renders geometry to scene by projecting to mercator in vertex shader

import {ShaderMaterial} from 'three'
import lambertVertex from './shaders/lambertVertex.glsl'
import lambertFragment from './shaders/lambertFragment.glsl'

import state from '../core/state'

const LngLatMercatorMaterial = new ShaderMaterial({
	side:2,
	uniforms: {
		zoom: state.uniforms.zoom,
		opacity: { value: 1 },
		// worldWidth: {value: constants.worldWidth},
		viewportSize: state.uniforms.viewportSize
		// diffuse: { value: new THREE.Color('green') }
	},

	vertexShader: lambertVertex,
	fragmentShader: lambertFragment
});

LngLatMercatorMaterial.onBeforeCompile = (s,r) => {


	s.vertexShader = s.vertexShader
		.replace(
			'#include <bsdfs>', 
			`#include <bsdfs>

			attribute vec3 LngLat;
			uniform mat4 worldTranslateMatrix;
			uniform vec3 worldPosition;
			uniform float latitude;`
		)
		.replace(
			'#include <project_vertex>',
			`vec4 mvPosition = vec4( transformed, 1.0 );

			#ifdef USE_INSTANCING

				mvPosition = instanceMatrix * mvPosition;

			#endif
			
			float latScale = 1.0 / cos(radians(latitude));
			mat4 lM = mat4(1.0);
			lM[2][2] = latScale;

			mvPosition = viewMatrix * lM * modelMatrix * mvPosition;

			gl_Position = projectionMatrix * mvPosition;`
		)
}

export default LngLatMercatorMaterial