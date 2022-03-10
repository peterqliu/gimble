// common methods for all primitives that
// need to be passed to some classes that already inherit from other classes

import {MathUtils, Matrix4, Vector3, Euler, Quaternion, Color} from 'three';
import {LngLat, Mercator} from '../coordMath.js'
import AnimationOptions from '../ui/AnimationOptions.js';
import state from '../core/state.js'
import utils from '../core/utils.js'

const methods = {

	addTo(map) {
		map.add(this)

		return this
	},

	create(d) {

		this
			.setZoomLevel(d.meshOptions?.layer)
			.setRenderOrder(d.style.renderOrder);

		if (d.source === 'geojson') this.centerGeometry()
		else this.setPosition(d.meshOptions.anchor)

		d.style.onMesh?.(this);

		return this

	},

	// to minimize floating-point rendering artifacts, minimize vertex coord magnitudes by
	// positioning mesh at its calculated center (default behavior), and all its vertices relative to that center.
	// optional Vector3 input to set as center.

	centerGeometry(m) {

		var positionDelta, m;

		if (m) positionDelta = m.clone().sub(this.position);

		else {
			this.geometry.computeBoundingSphere();
			m = this.geometry.boundingSphere.center.clone();
			positionDelta = m.clone().sub(this.position);
		}

		this.geometry.translate(-positionDelta.x, -positionDelta.y, -positionDelta.z);
		this.setPosition(m);

		return this
	},

	setZoomLevel(z) {

		if (typeof z === 'number') {
			const zoom = z+1 || 0;
			this.layers.set(zoom);
			this.traverse(c=>c.layers.set(zoom))

		}
		
		else if (typeof z === 'object' && z.length) {
			this.layers.disableAll();
			z.forEach(zl => this.layers.enable(zl+1))
		}		

		return this
	},

	
	setRenderOrder(r) {

		if (r ?? false) {
			this.renderOrder = r;
			this.traverse(item => {
				if (item.material) item.material.depthTest = false;
			})

		}

		return this
	},

	// calculate endMatrix,
	// and schedule scene rerender

	_update(skipMatrixUpdate) {

		if (!skipMatrixUpdate) this.updateMatrix();
		this.renderLoop?.rerender()

	},

	getPosition() {return new Mercator(this.position)},
	getLngLat() {return new Mercator(this.position).toLngLat()},
	getScale() {return this.scale},
	
	getBearing() {return MathUtils.radToDeg(this.rotation.z)},
	getPitch() {return MathUtils.radToDeg(this.rotation.x)},
	getRoll() {return MathUtils.radToDeg(this.rotation.y)},

	setLngLat(ll) {

		const position = ll instanceof LngLat ? ll.toMercator() : new LngLat(ll).toMercator();
		this.position.copy(position);

		this._update();

		return this;

	},

	setPosition(m) {

		if (m) {
			this.position.copy(m);
			this._update();
		}

		return this;

	},

	setScale(scale) {

		typeof scale === 'object' ? this.scale.set(scale.x, scale.y, scale.z) : this.scale.setScalar(scale);
		this._update();

		return this;

	},

	setRotation(rotation) {

		this.rotation.set(rotation);
		this._update();

		return this;

	},

	// bearing is clockwise (opposite typical Z rotation)
	setBearing(bearing) {

		this.rotation.z = - MathUtils.degToRad(bearing);
		this._update();

		return this;

	},

	setRoll(roll) {

		this.rotation.y = MathUtils.degToRad(roll);
		this._update();

		return this;

	},

	setPitch(pitch) {

		this.rotation.x = MathUtils.degToRad(pitch);
		this._update();

		return this;

	},

	setColor(color) {

		var rgb = new Color(color);
		switch (this.constructor.name) {

			case 'CircleMesh':

				this.iterateInstances(c => {

					const computed = this.computeValue(color, this.properties[c])
					rgb = new Color(computed);

					this.setColorAt(c, rgb)
				})	
				this.instanceColor.needsUpdate = true;

				break;

			case 'LabelMesh':

				this.children
					.forEach(child=>{
						const computed = this.computeValue(color, child.properties)
						rgb = new Color(computed);
						child.color = rgb
					})

				break;

			default:
				this.traverse(child => {

					if (child.material) child.material.color = rgb;

				})			
		}

		// schedule rerender without matrix update
		this._update(false);
		return this
	},

	setOpacity(opacity) {

		switch (this.constructor.name) {

			case 'CircleMesh':

				for (var c = 0; c<this.count; c++){
					const computed = this.computeValue(opacity, this.properties[c])
					this.setUniformAt('opacity', c, computed)
				}	

				break;

			case 'LabelMesh':
				this.children.forEach(child=>child.material[1].opacity = opacity)
				// this.material.opacity = opacity;
				// this.material.transparent = opacity !== 1;
				break;

			default:
				this.traverse(child => {

					if (child.material) {

						child.material.opacity = opacity;
						child.material.transparent = opacity !== 1;

					}
				})			
		}

		// schedule rerender without matrix update
		this._update(false);
		return this
	},

	computeValue(v, p) {
		return methods.isFunction(v) ? v(p) : v
	},

	isFunction(v) {
		return typeof v === 'function'
	},

	setTarget(mc) {

		const delta = mc.clone()
			.sub(this.position);
		this.rotation.z = Math.atan(delta.y/delta.x) - Math.PI/2 * Math.sign(delta.x)

		this._update();

		return this;

	},

	animateTo(o, onCompletion) {

		const options = utils.validate(o, animationRequirements);
		// if animation is deferred, add to animation queue and exit.
		// if not, the whole animation object will rewrite itself with the new options

		if (options.defer && this.animator?.animating) {

			this.animator.addDeferredAnimation(options, onCompletion)
			return this

		}

		// carry over queue from previous animator
		options.queue = this.animator?.queue || [];

		// at this stage, the animation is not deferred, and will fully rewrite
		// what was there before

		this.stopAnimation();

		const ao = new AnimationOptions(options, objectAnimationDefaults, onCompletion)
			.copyStartState(this)

		ao.wasCulling = this.frustumCulled;

		// tells renderer to keep rendering til at least this animation completes
		this.renderLoop
			.addToAnimationQueue(this)
			.animateUntilAtLeast(ao.until)

		// coalesce user input into position/quaternion/scale
		const c = methods.coalesceTransform
			.call(this, options, 'omitDefaults')
		
		Object.keys(c)
			.forEach(p => this[p].copy(c[p]))		

		ao.endState = Object.assign(c, {opacity: options.opacity});

		ao.endMatrix = new Matrix4()
			.compose(c.position || this.position, c.quaternion || this.quaternion, c.scale || this.scale);

		this.animator = ao;
		this.frustumCulled = false;

		return this

	},

	scrubTo(o) {

		const options = utils.validate(o, animationRequirements);

		this.stopAnimation();
		options.duration = 'manual';

		const ao = new AnimationOptions(options, objectAnimationDefaults)
			.copyStartState(this);

		// coalesce user input into position/quaternion/scale
		const c = methods.coalesceTransform
			.call(this, options, 'omitDefaults')

		Object.keys(c)
			.forEach(p => this[p].copy(c[p]))		

		ao.endState = Object.assign(c, {opacity: options.opacity});

		ao.endMatrix = new Matrix4()
			.compose(c.position || this.position, c.quaternion || this.quaternion, c.scale || this.scale);

		this.animator = ao;
		return this

	},

	setScrubber(p) {

		const progress = utils.validate(
			{singleItem: p}, 
			{
				_method: 'BasicObject().setScrubber()', 
				_required: true, 
				singleItem: setScrubberRequirements
			}
		).singleItem;

		const a = this.animator;

		if (a.duration !== 'manual') {
			console.warn('setScrubber: no scrub animation is currently set.')
			return
		}

		const prorated = this.animator.proratePiecewise(progress);

		if (prorated.opacity ?? false) {
			this.setOpacity(prorated.opacity)
		}

		this.matrix.compose(...prorated.matrix)
		this.renderLoop.rerender();
		return this

	},

	stopAnimation() {

		const a = this.animator;
		// set Mesh to matrix reflecting partial progress of animation
		if (a?.animating) {

			a.terminate(this);

			const prorated = a.proratePiecewise().matrix;
			([this.position, this.quaternion, this.scale])
				.forEach((p,i)=>p.copy(prorated[i]))

		}

		return this
	},

	// takes user position/scale/lnglat/pitch/roll/bearing/target
	// and produces a unified position/scale/quaternion

	coalesceTransform(o, omitDefaults) {

		var output = omitDefaults ? {} : {
			position: new Vector3(),
			scale: new Vector3(1,1,1),
			quaternion: new Quaternion()
		};

		if ('scale' in o) output.scale = typeof o.scale === 'number' ? new Vector3().setScalar(o.scale) : o.scale
	
		if ('target' in o) {

			const delta = o.target.clone()
				.sub(this.position);

			const euler = new Euler(0,0,Math.atan(delta.y/delta.x) - Math.PI/2 * Math.sign(delta.x));
			output.quaternion = new Quaternion()
				.setFromEuler(euler)

		}

		else if ('bearing' in o || 'pitch' in o || 'roll' in o) {
			const e = new Euler(
				MathUtils.degToRad(o.pitch ?? 0), 
				MathUtils.degToRad(o.roll ?? 0), 
				- MathUtils.degToRad(o.bearing ?? 0)
			);

			output.quaternion = new Quaternion().setFromEuler(e);
		}


		if (o.lngLat) output.position = o.lngLat instanceof LngLat ? o.lngLat.toMercator() : new LngLat(o.lngLat).toMercator()
		if (o.position) output.position = o.position;

		return output
	}
}

const animationRequirements = {

	_method: 'BasicObject().animateTo()',
	_required: true,

	duration: {
		type: ['number'],
		value: v=> v >= 0
	},

	deferred: {
		type: ['boolean']
	},

	pitch: {
		type: ['number']
	},

	bearing: {
		type: ['number']
	},

	roll: {
		type: ['number']
	},

	position: {
		type: ['object']
	},

	lngLat: {
		type: ['object']
	},

	scale: {
		type: ['object', 'number']
	}
}

const setScrubberRequirements = {
	required: true,
	type: ['number'],
	value: v=> v>=0 && v<=1
}

const objectAnimationDefaults = {
	position: undefined,
	lngLat: undefined,
	scale: undefined,
	roll: undefined
}

export default methods