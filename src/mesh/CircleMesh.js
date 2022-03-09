import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh'
import {Object3D, PlaneGeometry, Matrix4, Color} from 'three'
import CircleMaterial from '../material/CircleMaterial.js'
import state from '../core/state.js'
import methods from './ObjectMethods.js'
import utils from '../core/utils.js'

// Unlike other types, circles are an InstancedUniformsMesh of all the points in the input geometry. 
// circle styles are packed into instanceMatrix, and vertex shader will retrieve them from there

const matrixMapping = [
	'radius', 'color', 'strokeColor', 'billboard',
	'strokeWidth', ['color', 'g'], ['strokeColor', 'g'], 'zoomScale',
	'opacity', ['color', 'b'], ['strokeColor', 'b'], null,
	['translate', 'x'], ['translate', 'y'], ['translate', 'z'], null
]

export default class CircleMesh extends InstancedUniformsMesh {

	constructor(rawGeometry, style) {

		super(plane, makeCircleMaterial(style), rawGeometry.length);
		this.properties = [];
		this.style = {};

		this.iterateInstances(i => {
			const iM = utils.composeMatrix(rawGeometry[i].g);
			this.setMatrixAt(i, iM);
		})

		Object.assign(this, style)

		this.instanceMatrix.needsUpdate = true;

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

	applyStyleToMatrix(property, value, fnTransform) {

		this.style[property] = value;
		const isColor = property.toLowerCase().includes('color');

		this.iterateInstances(i => {

			// compute function and apply transformation
			const computed = methods.computeValue(value, this.properties[i]);
			const transformed = fnTransform?.(computed) ?? computed;

			const matrix = new Matrix4();
			this.getMatrixAt(i, matrix);

			const propertyIndex = matrixMapping.indexOf(property);

			if (isColor) {

				for (var j = 0; j<3; j++) {
					matrix.elements[propertyIndex+j*4] = transformed.toArray()[j]
				}
			}

			else matrix.elements[propertyIndex] = transformed;

			this.setMatrixAt(i, matrix);
			
		})

		this.instanceMatrix.needsUpdate = true;
		this.renderLoop?.rerender();
	}


	set color(c) {
		this.applyStyleToMatrix('color', c, v => new Color(v))
	}

	// scale is 2x radius
	set radius(r) {
		this.applyStyleToMatrix('radius', r*2)
	}

	set strokeColor(c) {
		this.applyStyleToMatrix('strokeColor', c, v => new Color(v))
	}

	set strokeWidth(w) {
		this.applyStyleToMatrix('strokeWidth', w)
	}

	set opacity(o) {
		this.applyStyleToMatrix('opacity', o)
	}

	set billboard(b) {

		const boolToBinary = boolean => boolean ? 1 : 0;
		this.applyStyleToMatrix('billboard', b, boolToBinary)

	}

	set zoomScale(z) {
		this.applyStyleToMatrix('zoomScale', z)
	}

	get billboard() {return this.style.billboard}
	get zoomScale() {return this.style.zoomScale}
	get opacity() {return this.style.opacity}
	get strokeWidth() {return this.style.strokeWidth}
	get strokeColor() {return this.style.strokeColor}
	get radius() {return this.style.radius}
	get color() {return this.style.color}


}

const validation = {

	radius:{
		type: ['number'],
		value: v => v >= 0
	},

	billboard: {
		type: ['boolean']
	}
}
function makeCircleMaterial(style) {

	const material = new CircleMaterial();
	material.uniforms.blur = {value: style.blur};	

	return material

}
const plane = new PlaneGeometry();

Object.assign(CircleMesh.prototype, methods)
