import {Mesh} from 'three';
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
		methods.setColor.call(this, c)
	}
	set opacity(o) {

		this.style.opacity = o;
		methods.setOpacity.call(this, o)

	}

	set pitch(p) {
		methods.setPitch.call(this, p)
	}

	set bearing(b) {
		methods.setBearing.call(this, b)
	}

	set roll(r) {
		methods.setRoll.call(this, r)
	}

	set target(t) {
		methods.setTarget.call(this, t)
	}

	set lngLat(ll) {
		methods.setLngLat.call(this, ll)
	}
}

Object.assign(BasicMesh.prototype, methods)
