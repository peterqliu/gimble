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
		this.properties = [];

		this.iterateInstances(i => {

			const circleStyle = rawGeometry[i].s;
			circleStyle.strokeColor = new Color(circleStyle.strokeColor);

			this.setMatrixAt(i, utils.composeMatrix(rawGeometry[i].g));
			this.setColorAt(i, new Color(circleStyle.color || style.color));

			(['radius', 'strokeWidth', 'strokeColor', 'opacity'])
				.forEach(property => this.applyUniform(style[property], circleStyle[property], property, i))

			this.properties[i] = rawGeometry[i].p
		})

		this.style = style;
		this.instanceMatrix.needsUpdate = true;
		this.instanceColor.needsUpdate = true;

		if (style.renderOrder){
			this.renderOrder = style.renderOrder;
			this.material.depthTest = false;
		}

	}

	// apply properties as uniform values. if literal, apply as a single material uniform.
	// if function, use InstancedUniformMesh's .setUniformAt()
	applyUniform(rawValue, computedValue, property, i) {
		
		if (typeof rawValue === 'function') this.setUniformAt(property, i, computedValue)
		else this.material.uniforms[property].value = computedValue;

	}

	iterateInstances(fn) {
		for (var j = 0; j<this.count; j++) fn(j)
	}

	set color(c) {
		this.style.color = c;
		methods.setColor.call(this, c)	
	}

	set radius(r) {

		this.style.radius = r

		this.iterateInstances(i => {
			const computed = methods.computeValue(r, this.properties[i])
			this.setUniformAt('radius', i, computed)
		})

		this.renderLoop?.rerender();

	}

	set strokeColor(c) {

		this.style.strokeColor = c;

		this.iterateInstances(i => {
			const computed = methods.computeValue(c, this.properties[i])
			this.setUniformAt('strokeColor', i, new Color(computed))
		})

		this.renderLoop?.rerender();	

	}

	set strokeWidth(c) {

		this.style.strokeWidth = c;
		this.iterateInstances(i => {
			const computed = methods.computeValue(c, this.properties[i])
			this.setUniformAt('strokeWidth', i, computed)
		})

		this.renderLoop?.rerender();

	}

	set opacity (o) {
		this.style.opacity = o;
		methods.setOpacity.call(this, o)
	}


	// setZoomLevel(z) {

	// 	methods.setZoomLevel.call(this, z);
	// 	return this
	// }
}

const validation = {

	radius:{
		type: ['number'],
		value: v => v >= 0
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

Object.assign(CircleMesh.prototype, methods)
