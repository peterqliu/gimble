import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh'
import {Object3D, PlaneGeometry, Matrix4, Color} from 'three'
import CircleMaterial from '../material/CircleMaterial.js'
import state from '../core/state.js'
import methods from './ObjectMethods.js'
import utils from '../core/utils.js'



// Unlike other types, circles are an InstancedUniformsMesh of all the points in the input geometry. 
// 1) Circle position is set with instanceMatrix, and color as instanceColor. the overall IUM position shifts only to reflect tile centers
// 2) Radius/strokeWidth/strokeColor are passed in as per-instance uniforms. 
// 3) Billboarding, zoomScale, and blur are set on instantiating the material

export default class CircleMesh extends InstancedUniformsMesh {

	constructor(rawGeometry, style) {

		super(plane, makeCircleMaterial(style), rawGeometry.length);

		for (var i = 0; i<rawGeometry.length; i++) {

			const circleStyle = rawGeometry[i].s;
			circleStyle.strokeColor = new Color(circleStyle.strokeColor);

			this.setMatrixAt(i, utils.composeMatrix(rawGeometry[i].g));
			this.setColorAt(i, new Color(circleStyle.color || style.color));

			// set per-instance values of size 1 per instance
			(['radius', 'strokeWidth', 'strokeColor'])
				.forEach(property => this.setUniformAt(property, i, circleStyle[property]))

		}

		this.instanceMatrix.needsUpdate = true;
		this.instanceColor.needsUpdate = true;

		if (style.renderOrder){
			this.renderOrder = style.renderOrder;
			this.material.depthTest = false;
		}

	}

	setZoomLevel(z) {

		methods.setZoomLevel.call(this, z);
		return this
	}
}

function makeCircleMaterial(style) {

	const material = new CircleMaterial();
	material.uniforms.billboardMatrix = style.billboard ? state.uniforms.cameraRotationMatrix : {value: new Matrix4()}	
	material.uniforms.zoomScaled = style.zoomScaled ? {value: 1} : {value: 0};	
	material.uniforms.blur = {value: style.blur};	

	return material

}
const plane = new PlaneGeometry();
