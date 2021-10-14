import state from '../core/state.js';
import utils from '../core/utils.js'
import {MathUtils, Matrix4, Quaternion, Vector3} from 'three';
// import {get} from './mapControl'

// a shared class for animations between the map itself, and most objects
export default class AnimationOptions {

	constructor(o, customDefaults, onCompletion) {

		if (onCompletion && typeof onCompletion !== 'function') console.warn(`AnimationOptions: Callback is not a function.`)
		if (o.easing && typeof o.easing !== 'function') console.warn(`AnimationOptions: Easing is not a function.`)
		
		else {


			// if from scrubTo
			if (o.duration === 'manual') {

				Object.assign(this, o);	
				if (o.type === 'map') this._computeMapAnimation(o)

				return this

			}

			// if from animateTo

			const now = state.getU('now');

			// add global animation defaults to custom defaults
			const defaults = Object.assign({

				duration: 250,
				pitch: undefined,
				bearing: undefined,
				queue: [],
				easing: t => MathUtils.smoothstep(t, 0, 1)

			}, customDefaults);

			// apply defaults to user options
			const options = utils.applyDefaults(o, defaults);

			// add timing
			Object.assign(this, 
				options, 
				{
					animating: true,
					startTime: now,
					until: now + options.duration,
					onCompletion: onCompletion
				}
			);

			if (o.type === 'map') this._computeMapAnimation(o)

		}
	}

	_computeMapAnimation(o) {

		if (o.center) this.centerChanging = this.worldWillAnimate = true
		
		if (o.hasOwnProperty('zoom')) this.zoomChanging = this.worldWillAnimate = true
		
		if (this.worldWillAnimate) {
			this.worldEnd = {
				center: this.center,
				scale: Math.pow(2, this.zoom) || undefined,
			}
		}

		// camera changes

		// pitch and bearing are animated by manipulating camera.
		// During animation, the two will be lerped separately between start and end states,
		// from which the intermediate matrices will be calculated each frame
		this.cameraStart = {
			pitch: state.getU('pitch'),
			bearing: state.getU('bearing')
		}

		this.cameraEnd = {};

		if (o.hasOwnProperty('pitch')) {
			state.setU('pitch', o.pitch);
			this.pitchChanging = this.cameraWillAnimate = true;
			this.cameraEnd.pitch = o.pitch;
		}

		if (o.hasOwnProperty('bearing')) {
			state.setU('bearing', o.bearing);
			this.bearingChanging = this.cameraWillAnimate = true
			this.cameraEnd.bearing = o.bearing;
		}

		// world animations

		// zoom and center are animated by manipulating world.
		// Calculating start and end matrices for world, MapAnimation.step
		// will lerp between the two and apply intermediate values
		this.worldStart = {
			center: state.getU('center').toArray(),
			scale: Math.pow(2, state.getU('zoom')),
		}

	}



	// copy the start transforms of an object
	copyStartState(target) {
		this.startState = {
			position: target.position.clone(), 
			quaternion: target.quaternion.clone(), 
			scale: target.scale.clone()
		}

		return this
	}

	// mesh/object animation only, fired by coreLoop

	coreLoopAnimation = mesh => {

		const now = state.getU('now');

		// if animation ends now
		if (this.until < now) {
			this
				.complete(mesh)
				.loadNextAnimation(mesh, this)
		}
		
		// if animation keeps going, lerp it from the start and end matrices.
		// model matrix will fall out of sync with p/s/r (which jumped instantly to end states) during animation
		
		else mesh.matrix.copy(this.animateMatrix())
		
	}

	// get animation progress expressed between 0-1, 
	// given current time and total animation duration

	getProgress(uneasedProgress) {
		const linear = uneasedProgress ?? MathUtils.clamp((state.getU('now') - this.startTime) / this.duration, 0, 1);
		return this.easing?.(linear) || linear
	}

	// take position, quaternion, scale and interpolate them individually
	// between startState and endState
	proratePiecewise(p) {

		// calculate progress
		const progress = this.getProgress(p);

		// start and end states
		const s = this.startState;
		const e = this.endState;

		// if end state present, interpolate as appropriate
		// if not, use start state directly (prop is not changing)
		const P = e.position ? new Vector3().lerpVectors(s.position, e.position, progress) : s.position;		
		const Q = e.quaternion ? s.quaternion.clone().slerp(e.quaternion, progress) : s.quaternion;
		const S = e.scale ? new Vector3().lerpVectors(s.scale, e.scale, progress) : s.scale;

		return [P, Q, S]
	}

	// apply interpolated properties and builds matrix
	animateMatrix(progress) {

		const [P, Q, S] = this.proratePiecewise(progress);

		// apply intermediate states

		const matrix = new Matrix4()
			.setPosition(P)
			.multiply(new Matrix4().makeRotationFromQuaternion(Q))
			.multiply(new Matrix4().makeScale(S.x, S.y, S.z))

		return matrix

	}


	// linear interpolation between two matrices. works only if there's no rotation changing.
	// currently used for zoom/center animation specifically.
	lerpMatrices(start, end, p) {

		const progress = this.getProgress(p);

		return new Matrix4().fromArray(
			start.elements
				.map((d,i) => d * (1 - progress) + end.elements[i] * progress)
		)
	}

	// trigger completion of animation
	complete(mesh) {

		this.onCompletion?.();
		if (!mesh) return this

		mesh.matrix.copy(this.endMatrix);
		this.terminate(mesh);
		return this
	}

	terminate(mesh) {
		this.animating = false;
		mesh.frustumCulled = this.wasCulling;
	}


	// add animation to a queue, executing it after others have completed
	addDeferredAnimation(options, onCompletion) {
		Object.assign(options, {
			defer:false,
			onCompletion: onCompletion
		})

		this.queue.push(options)
		return this
	}

	loadNextAnimation(objectOrMap, setup) {

		const nextAnimation = this.queue.shift();
		if (nextAnimation) {
			if (objectOrMap.type === 'MapAnimation') objectOrMap.animateTo.call(setup, nextAnimation, nextAnimation.onCompletion)
			else objectOrMap.animateTo(nextAnimation, nextAnimation.onCompletion)
		}

		return this
	}
}