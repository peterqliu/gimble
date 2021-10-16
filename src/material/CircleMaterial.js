import state from '../core/state.js'

import circleFragment from './shaders/circleFragment.glsl';
import circleVertex from './shaders/circleVertex.glsl';
import {Matrix4, ShaderMaterial, Vector3} from 'three'

export default class CircleMaterial extends ShaderMaterial {

	constructor() {
		super({

			side:2,
			transparent: true,
			depthWrite: false,
			uniforms: {

				zoom: state.uniforms.zoom,
				opacity: { value: 1 },
				radius: {value:1},
				blur: {value:0},
				strokeWidth: {value: 0},
				strokeColor:{value: new Vector3(1,1,1)},
				viewportSize: state.uniforms.viewportSize,

				billboardMatrix: state.uniforms.cameraRotationMatrix,
				zoomScaled: {value: 0},

				// world animation
				now: state.uniforms.now,

			},

			vertexShader: circleVertex,
			fragmentShader: circleFragment

		})
	}
}