import {MathUtils, Mesh, Matrix4, Vector3} from 'three';
import StaticMesh from './StaticMesh'

import {LngLat} from '../coordMath'
import state from '../core/state'

export default class ShaderAnimationMesh extends StaticMesh {

	// general pattern for updating position/scale/rotation:
	// 1) method changes p/s/r parameters, invokes _update
	// 2) _update updates local matrix, and triggers scene rerender
	// 3) scene rerender calls mesh's onBeforeRender, until mesh stops animating

	constructor(geometry, material) {

		super(geometry, material);

		this.updateMatrix();

		this._animation = {
			animating: false,
			until: 0,
			cb: undefined
		}

		this.onBeforeRender = () => {


			if (this._animation.animating && this._animation.until < state.uniforms.now.value) {

				this._animation.animating = false;
				this.frustumCulled = true;

				if (this._animation.cb) {
					this._animation.cb(this);
					this._animation.cb = undefined;
				}
			}
		}

	}

	// update the local matrix to reflect scale/position/rotation changes, and set endMatrix to that
	// and schedule scene rerender

	_update() {
		this.updateMatrix();
		this._setUniform('endMatrix', new Matrix4().copy(this.matrix));
		this.renderLoop?.rerender()
	}

	setLngLat(ll, _delayUpdate) {

		const position = ll instanceof LngLat ? ll.toV3() : new LngLat(ll).toV3();
		this.position.copy(position);

		this._update();

		return this;
	}

	setPosition(v3, _delayUpdate) {

		this.position.copy(v3);
		
		if (!_delayUpdate) this._update();

		return this;

	}

	setScale(scale, _delayUpdate) {

		isNaN(scale) ? this.scale.set(scale) : this.scale.setScalar(scale);

		if (!_delayUpdate) this._update();

		return this;

	}

	setRotation(rotation, _delayUpdate) {

		this.rotation.set(rotation);

		if (!_delayUpdate) this._update();

		return this;

	}

	setBearing(bearing, _delayUpdate) {

		this.rotation.y = MathUtils.degToRad(bearing);

		if (!_delayUpdate) this._update();

		return this;

	}

	setRoll(roll, _delayUpdate) {

		this.rotation.z = MathUtils.degToRad(roll);

		if (!_delayUpdate) this._update();

		return this;

	}

	setPitch(pitch, _delayUpdate) {

		this.rotation.x = MathUtils.degToRad(pitch);

		if (!_delayUpdate) this._update();

		return this;

	}

	animateTo(options, duration, onCompletion) {

		this.stopAnimation();
		
		const now = performance.now();

		// set animation time and start matrix uniforms
		this
			._setUniform('startMatrix', new Matrix4().copy(this.matrix))
			._setUniform('duration', options.duration || 250)
			._setUniform('startTime', now)

		// tells renderer to keep rendering til at least this animation completes
		state.render.animateUntil = state.uniforms.animateUntil.value =
		Math.max(state.render.animateUntil, this.material.uniforms.duration.value + now);
		
		// apply actual changes
		// onBeforeRender will update endMatrix to reflect these
		meshParams
			.forEach(p => {
				const value = options[p.toLowerCase()];
				if (value !== undefined) this[`set${p}`](value, true);
			})

		this._update();
		this.frustumCulled = false;
		this._animation = {
			animating: true,
			until: this.material.uniforms.duration.value + now,
			cb: onCompletion
		}

		return this

	}

	_setUniform(key, value) {
		this.material.uniforms[key].value = value;
		return this
	}

	stopAnimation() {

		const u = this.material.uniforms;

		// set Mesh to matrix reflecting partial progress of animation
		if (this._animation.animating) {

			this._animation.animating = false;
			this._animation.cb = undefined;

			const now = state.uniforms.now.value;
			const progress = (now - u.startTime.value) / u.duration.value;

			this.position.lerp( new Vector3().setFromMatrixPosition(u.startMatrix.value), 1 - progress )
			this.scale.lerp( new Vector3().setFromMatrixScale(u.startMatrix.value), 1 - progress )

			this.updateMatrix();


			// adjust timeframe to force animation to end state (the previously calculated )
			this
				._setUniform('endMatrix', new Matrix4().copy(this.matrix))
				._setUniform('duration', 1)
				._setUniform('startTime', now-2)



		}

		return this
	}
}


const meshParams = ['Scale', 'Bearing', 'Pitch', 'Roll', 'LngLat', 'Position']
