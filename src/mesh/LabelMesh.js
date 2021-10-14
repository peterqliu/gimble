import {Vector3, Matrix4, Color} from 'three'
import {Text} from 'troika-three-text'

import state from '../core/state.js'
import methods from './ObjectMethods.js'


export default class LabelMesh extends Text {

	constructor(geom, styleObj) {

		super();

		// apply billboarding and zoomscaling to vertex shader
		this.material.onBeforeCompile = s => s.vertexShader = transformVertexShader(s.vertexShader)
		if (styleObj.renderOrder !== 0) this.material.depthTest = false;

		Object.assign(
			this.material.uniforms, 
			{
				billboardMatrix:styleObj.billboard ? state.uniforms.cameraRotationMatrix : {value: new Matrix4()},
				zoom: styleObj.zoomScaled ? {value: 0} : state.uniforms.zoom	
			}
		)

		Object.assign(this, {

			font: styleObj.fontUrl, 
			text: styleObj.text,
			fontSize: styleObj.size / 50,
			color: new Color(styleObj.color),
			textAlign: styleObj.align,
			maxWidth:  0.01 * styleObj.maxWidth * styleObj.size,

			outlineWidth: styleObj.size * styleObj.haloWidth/500,
			outlineColor: styleObj.haloColor,
			anchorX: styleObj.anchorX,	
			anchorY: styleObj.anchorY,

			matrixAutoUpdate: false,
			renderOrder: 11

		})

		this.position
			.copy(new Vector3()
				.add(geom.g)
				.add(styleObj?.translation ?? new Vector3())
			)

		this.updateMatrix();
		
		// flag rerender whenever the text finishes updating	
		this.sync( ()=> this.renderLoop?.rerender());

		return this
	}

	setZoomLevel(z) {

		methods.setZoomLevel.call(this, z);
		return this
		
	}

	applyTileTranslation(t) {

		this.position.add(t);
		this.updateMatrix();

		return this;
	}
}

const transformVertexShader = vs => {

	// three injection points for adding definitions, billboarding, and zoomScaling
	const definitionsFlag = `uniform vec3 diffuse;`
	const billboardFlag = `mvPosition = modelViewMatrix * `;
	const zoomScaleFlag = `vec4 mvPosition = vec4( transformed`;

	const edited = vs
		.replace(
			`uniform vec3 diffuse;`,
			`${definitionsFlag}
			uniform mat4 billboardMatrix;
			uniform float zoom;`
		)
		.replace(
			billboardFlag, 
			`${billboardFlag}billboardMatrix * `, 

		)
		.replace(
			zoomScaleFlag,
			`float zoomScale = pow(2.0, 22.0 - zoom);
			${zoomScaleFlag} * zoomScale`
		)

	return edited
}