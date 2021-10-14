import {intersect, LngLat} from '../coordMath.js'
import utils from '../core/utils.js';
import constant from '../core/constants.js'
import {setup, addToWorld} from './threeSetup.js';
import {
	set, 
	updateCameraMatrix, 
	updateCameraLayer,
	MapAnimation,
	panWorld
} from './mapControl.js'

import {bindGestures, EventManager, dispatchEvents} from './userInteraction.js'

import {projectViewshed} from '../tile/tileMath.js'

import {updateTiles} from '../tile/tileManager.js'

import state from '../core/state.js'
import mapStyle from '../mapStyle.js'

import {MathUtils} from 'three'
import workers from '../worker/workers.js'



export default class gimbleMap {

	// container: id of element to add canvas to

	// center
	// pitch
	// bearing
	// zoom

	// interactive
	// background: background color (optional, default white)
	// defaultLights
	// lazyRender: render on demand (default true)
	// style: stylesheet for map
	// hash: hash map state in url (default false)

	// onRenderer: optional function hook to access renderer upon initialization. must return an instance of WebGLRenderer
	// onCamera: optional function hook to access camera upon initialization. must return an instance of PerspectiveCamera
	
	// onLoop: optional function to run on each render loop (render not necessarily happening)
	// onRender: option function to run on each render frame

	constructor(options){

		const o = utils.applyDefaults(
			utils.validate(options, inputValidation), 
			constant.mapDefaults
		);

		this.id = Math.random();
		this.setup = setup.init(o);

		this.setup.coreLoop.map = this;
		this.loop.setInRenderer({

			eventDispatcher: dispatchEvents,

			update: {
				world: panWorld,
				camera: updateCameraMatrix,
				tiles: updateTiles
			},

			mapAnimation: MapAnimation,
			onRender: options.onRender,
			onLoop: options.onLoop
		});


		if (o.hash) set.hash.call(this, location.hash);

		else {
			if (o.center) this.center = o.center
			if (o.zoom >= 0) this.zoom = o.zoom
			if (o.pitch >= 0) this.pitch = o.pitch
			if (!isNaN(o.bearing)) this.bearing = o.bearing		
		}

		updateCameraMatrix
			.call(this.setup);
		
		if (o.interactive !== false) bindGestures(o.interactivity, this);

		// add this map instance to geometryPool
		// so it could add meshes directly to scene
		workers.init()
			.targets[this.id] = this;

		if (o.style) {

			mapStyle.init(o.style, () => updateTiles(this));
			updateCameraLayer.call(this);
		}
		
		state.startSettings = o;

		Object.assign(this, {

			render: force => {

				if (force) setup.renderer.render(scene, camera)
				else this.loop.rerender()

				return this
			},

			getViewshed: projectViewshed,

			state: state

		})
	}

	on(event, cb) {

		EventManager.addListener(event, cb, this);
		return this

	}

	animateTo(o, onCompletion) {MapAnimation.animateTo.call(this.setup, o, onCompletion)}
	stopAnimation() {MapAnimation.stop()}

	scrubTo(o) { MapAnimation.scrubTo.call(this.setup, o) }
	setScrubber(progress) {MapAnimation.setScrubber.call(this.setup, progress)}
	
	add(input) {
		addToWorld.call(this.setup, input); 
		return this
	}

	intersect(e,o) {return intersect.call(this, e, o)}

	get loop() { return this.setup.coreLoop }
	get renderer() {return this.setup.renderer}
	get camera() {return this.setup.camera}
	get world() {return this.setup.world}
	get scene() {return this.setup.scene}

	set center(lnglat) {

		const ll = lnglat instanceof LngLat ? lnglat : new LngLat(lnglat);
		set.center.call(this.setup, ll)

		this.loop.rerender()
		return this

	}

	set zoom(z) {

		set.zoom.call(this, z)
		set.center.call(this.setup, new LngLat(state.getU('center')))

		this.loop.rerender()
		return this	

	}

	set pitch(p) {

		set.pitch.call(this, p)
		return this

	}

	set bearing(b) {

		set.bearing.call(this, b)
		return this

	}

	get center() { return new LngLat(state.getU('center')) }
	get zoom() {return state.getU('zoom')}
	get pitch() {return state.getU('pitch')}
	get bearing() {return state.getU('bearing')}

}

var inputValidation = {

	_method: 'Map()',
	_required: true,

	container: {
		required: true,
		value: v => typeof v === 'string' || v instanceof HTMLElement
	},

	interactivity: {

		type: ['object'],

		value: v => {

			var valid = true;

			const mapActions = ['dragPan', 'dragRotate', 'scrollZoom']
			const mouseActions = ['leftDrag', 'rightDrag', 'wheel']
			
			mouseActions.forEach(action => {
				if (action in v && !mapActions.includes(v[action])) valid = false
			})

			return valid
		}
	},

	hash: {
		type: ['boolean']
	},

	defaultLights: {
		type: ['boolean']
	},

	lazyRender: {
		type: ['boolean']
	},	

	onRender: {
		type: ['function']
	},

	onLoop: {
		type: ['function']
	},

	background: {
		type: ['string']
	}

}