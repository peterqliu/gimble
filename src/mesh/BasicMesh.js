import {Mesh, Float32BufferAttribute, Color} from 'three';
import methods from './ObjectMethods.js'

// This class implements animations entirely on CPU: calculating end-state matrices from p/s/r,
// linearly interpolating the matrix from start to end on each frame

export default class BasicMesh extends Mesh {

	constructor(geometry, material) {

		super(geometry, material);

		this.updateMatrix();
		this.matrixAutoUpdate = false;
	}

	get opacity() {
		return this.style.opacity
	}

	set color(c) {
		this.style.color = c;
		this.applyValue('color', c, {
			literal:c=> new Color(c),
			variable: c=> new Color(c).toArray()
		})

	}

	set opacity(o) {

		this.style.opacity = o;
		methods.setOpacity.call(this, o)

	}

	applyValue(k, v, fn) {

		if (methods.isFunction(v)) {

			var array = []

			this.properties.indices.forEach((p,i)=>{
				const computed = v(this.properties.values[i]);
				const transformed = fn.variable ? fn.variable(computed) : computed;
				for (var j =0; j<p.length; j++) array.push(...transformed);
			})

			const attribute = new Float32BufferAttribute(array, 1)
			attribute.needsUpdate = true;
			this.geometry.setAttribute(k, attribute)
			this.material.vertexColors = true;
		}

		else {
			console.log('literal')
			// this.material.vertexColors = false;
			this.geometry.deleteAttribute(k);
			const styleValue = fn.literal ? fn.literal(v) : v;
			if (this.material.uniforms) {
				this.material.uniforms[`u_${k}`] = {value: styleValue};
			}

			else this.material.color = styleValue
		}

		this.renderLoop?.rerender();
	}

}

Object.assign(BasicMesh.prototype, methods)
