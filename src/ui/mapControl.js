import {Vector2, Vector3, Quaternion, Matrix4, MathUtils} from 'three'
import constant from '../core/constants.js'
import state from '../core/state.js'
import {LngLat, Mercator} from '../coordMath.js'
import u from '../core/utils.js'
import AnimationOptions from './AnimationOptions.js'

// panning, zooming, pitching map

export const set = {

	center: function(lnglat, worldPositionReady) {
		
		const wP = worldPositionReady || lnglat._toWorldPosition(get.zoom());
		state.setU('center', lnglat.toVector3())

		this.world.position.copy(wP)
		this.world.updateMatrix()
		
		return this
	},

	zoom: function(zoom) {

		state.setU('zoom', zoom);

		this.world.scale
			.copy(zoomToWorldScale(zoom));

		set._registerEvent('Zoom');

		const newZoomFloor = Math.floor(zoom);
		const newZoomIntegerReached = newZoomFloor !== state.interaction.lastIntegerZoom;

		if (newZoomIntegerReached) {

			state.interaction.lastIntegerZoom = newZoomFloor;

			// if (newZoomFloor>state.interaction.lastIntegerZoom){
			// 	// state.camera.deferredCameraLayerUpdate = true;
			// }

			// else updateCameraLayer();

			if (state.stylesheet) updateCameraLayer.call(this)
			
		}
	

		return this
	}, 

	pitch: function(pitch) {

		MapAnimation.stop.call(this);
		state.setU('pitch', pitch)
		
		this.loop.updateCamera();
		set._registerEvent('Pitch')

		return this
	},

	bearing: function(bearing) {

		MapAnimation.stop.call(this);
		state.setU('bearing', bearing)

		this.loop.updateCamera();

		set._registerEvent('Bearing')

		return this

	},

	// set initial view parameters from hash

	hash: function(hashString) {

		const hash = hashString
			.replace('#', '')
			.split('/')
			.map(s=>parseFloat(s));
		
		if (hash.some( n => isNaN(n))) return
		
		try {

			const [zoom, lat, lng, bearing, pitch] = hash

			set.zoom.call(this, zoom);
			set.center.call(this, new LngLat([lng, lat]));
			set.bearing.call(this, bearing ?? 0);
			set.pitch.call(this, pitch ?? 0);

		}

		// fail silently
		catch (error) {}

	},

	_registerEvent: event => {

		// need high-res timer to avoid race condition with event dispatcher
		state.interaction[`last${event}`] = state.interaction.lastMove = performance.now();
		return set
	}
}


export const MapAnimation = {

	type: 'MapAnimation',
	animator: new AnimationOptions({}),

	animating: false,

	worldStartMatrix: new Matrix4(),
	worldEndMatrix: new Matrix4(),

	_setWorldCameraStartStates: function() {

		const a = MapAnimation.animator;

		if (a.worldWillAnimate) {

			MapAnimation.animating = true;
			MapAnimation.worldStartMatrix
				.copy(this.world.matrix);
			MapAnimation.worldEndMatrix
				.copy(coalesceWorldTransform(
					a.center ?? get.center(), 
					a.zoom ?? get.zoom()
				))

		}

	},

	// start an animation (called by map.animateTo)
	animateTo: function(options, onCompletion) {

		if (options.defer && MapAnimation.animating) {

			MapAnimation.animator
				.addDeferredAnimation(options, onCompletion)

			return this

		}

		MapAnimation.stop.call(this);
		MapAnimation.animating = true;

		options.type = 'map';
		options.queue = MapAnimation.animator.queue;

		const a = new AnimationOptions(
			options, 
			{					
				center: undefined,
				zoom: undefined,
			}, 
			onCompletion)


		const now = performance.now();

		this.coreLoop.animateUntilAtLeast(a.until)

		// tells renderer to keep rendering til at least this animation completes
		state.setU('animateUntil', a.until)

		state.setU('worldAnimationStartTime', now);

		// set animation time and start matrix uniforms
		state
			.setU('cameraStartMatrix', new Matrix4().copy(this.camera.matrixWorldInverse))
			.setU('worldStartMatrix', new Matrix4().copy(this.world.matrix))
			.setU('worldAnimationDuration', a.duration);
		
		this.coreLoop.rerender();
		MapAnimation.animator = a;
		MapAnimation._setWorldCameraStartStates.call(this)

		return this
	},

	scrubTo: function(options) {

		options.duration = 'manual';
		options.type = 'map';

		MapAnimation.animator = new AnimationOptions(
			options, 
			{					
				center: undefined,
				zoom: undefined,
			}
		)

		MapAnimation._setWorldCameraStartStates.call(this);

		return this
	},

	setScrubber: function(progress) {

		const a = MapAnimation.animator;

		if (a.duration !== 'manual') {
			console.warn('setScrubber: no scrub animation is currently set.')
			return
		}

		// set to true so that .stop()
		// works properly to update world/camera position/scale/rotations
		MapAnimation.animating = true;

		// TODO: run this stepping within coreLoop
		// so that it doesn't step more than once per render cycle
		MapAnimation
			.step.call(this, progress)
			.stop.call(this, progress)
			.animating = false;

		this.coreLoop.rerender();

		return this

	},

	// step through an animation (called by render loop when map is animating)
	// optional progress argument to use instead of time progress 
	step: function(rawProgress) {

		if (!MapAnimation.animating) return MapAnimation

		const now = state.getU('now');
		const a = MapAnimation.animator;
		const progress = a.getProgress(rawProgress);

		if (a.worldWillAnimate) {

			this.world.matrix.copy(a.lerpMatrices(
				MapAnimation.worldStartMatrix, 
				MapAnimation.worldEndMatrix, 
				rawProgress
			))

			if (a.centerChanging) set._registerEvent('Center');	
			if (a.zoomChanging) set._registerEvent('Zoom');	

		}

    	if (a.cameraWillAnimate) {

    		// calculate instantaneous pitch and bearing
    		// will also use this to set state when animation terminates
    		a.cameraStep = [
    			a.pitchChanging ? MathUtils.lerp(a.cameraStart.pitch, a.cameraEnd.pitch, progress) : a.cameraStart.pitch,
    			a.bearingChanging ? MathUtils.lerp(a.cameraStart.bearing, a.cameraEnd.bearing, progress) : a.cameraStart.bearing
    		]

    		// apply pitch and bearing into camera rotation matrix

    		const rM = calculateCameraRotation(...a.cameraStep)
			this.camera.matrixWorld
				.copy( new Matrix4()
					.makeTranslation(0, 0, constant.worldWidth*2)
					.premultiply(rM)
				)

			state.setU('cameraRotationMatrix', rM);
			if (a.bearingChanging) set._registerEvent('Bearing');	
			if (a.pitchChanging) set._registerEvent('Pitch');	

		}

		// when animation ends
		if (now > a.until) {
			// fire callback if there is one
			MapAnimation.stop.call(this, 1);
			a.complete()
				.loadNextAnimation(MapAnimation, this)

		}

		return MapAnimation
	},

	stop: function(rawProgress) {

		if (!MapAnimation.animating) return MapAnimation

		MapAnimation.animating = MapAnimation.worldWillAnimate = MapAnimation.cameraWillAnimate = false;

		const a = MapAnimation.animator;
		const progress = a.getProgress(rawProgress);


		if (a.worldWillAnimate) {

			const scale = a.worldEnd.scale ? 
				MathUtils.lerp(a.worldStart.scale, a.worldEnd.scale, progress) :
				a.worldStart.scale

			var p = new Mercator()
			var s = new Vector3();
			this.world.matrix.decompose(p, new Quaternion(), s)
			const z = Math.log2(scale)

			set.zoom.call(this, z)
			set.center.call(this, p._asWorldPositionToLngLat(z))

		}

		if (a.cameraWillAnimate) {

			state.setU('pitch', a.cameraStep[0]);
			state.setU('bearing', a.cameraStep[1]);

		}

		return MapAnimation

	}		

}



//apply translation to world as result of mouse panning
// fired by coreLoop.updateWorld
export function panWorld(deltaV3) {

	const world = this.world;
	MapAnimation.animating = false;
	var newPos = state.camera.worldPanDelta
		.add(world.position)
		// .clamp(
		// 	new Vector3(-wR, -wR, 0),
		// 	new Vector3(wR, wR, 0)
		// )

	world.position.copy(newPos)
	world.updateMatrix()

	set._registerEvent('Drag')

	state.setU('center', newPos._asWorldPositionToLngLat(get.zoom()).toVector3())
	state.camera.worldPanDelta = new Mercator(0,0,0);

}



export function updateCameraMatrix() {

	// maintain stepback distance from world
	var centeringMatrix = new Matrix4()
		.makeTranslation(0, 0, constant.worldWidth*2)

	const rotationMatrix = calculateCameraRotation(
		get.pitch(), 
		get.bearing()
	);
	
	this.camera.matrixWorld
		.identity()
		.premultiply(centeringMatrix)
		.premultiply(rotationMatrix)

	this.camera.matrixWorldInverse
		.copy(this.camera.matrixWorld)
		.invert()

	// update camera rotation uniform for objects that billboard (labels, etc)
	state.uniforms.cameraRotationMatrix.value
		.identity()
		.premultiply(rotationMatrix)

	this.coreLoop.rerender()
};

const calculateCameraRotation = (pitch, bearing) => {

	var pitchMatrix = new Matrix4()
		.makeRotationX(MathUtils.degToRad(pitch))

	var bearingMatrix = new Matrix4()
		.makeRotationZ(MathUtils.degToRad(bearing))	

	return new Matrix4()
		.premultiply(pitchMatrix)
		.premultiply(bearingMatrix)

}

export const get = {

	center: () => new LngLat(state.getU('center')),
	zoom: () => state.getU('zoom'),
	pitch: () => state.getU('pitch'),
	bearing:() => state.getU('bearing')
	
}

// change tile visibility by changing the camera's layer membership (0 always on, as the object3d default)
export function updateCameraLayer() {

	this.camera.layers.disableAll();
	this.camera.layers.enable(0);
	this.camera.layers.enable(state.interaction.lastIntegerZoom+1);
	this.loop.rerender();

}




// convert center/zoom into a transform matrix for world
export const coalesceWorldTransform = (center, zoom) => {

	var position;

	if (center instanceof Mercator) position = center;

	else position = lngLatToWorldPosition(center, zoom)

	return new Matrix4()
		.compose(
			position, 
			new Quaternion(), 
			zoomToWorldScale(zoom)
		)
}

const lngLatToWorldPosition = (center, zoom) => {
	const zoomScale = Math.pow(2, zoom);

	const ll = center instanceof LngLat ? center : new LngLat(center);
	return ll
		.toMercator()
		.multiplyScalar(-zoomScale);	
}

const zoomToWorldScale = zoom => {
	return new Vector3().setScalar(Math.pow(2,zoom))
}


// todo
// const fitCameraToObject = function ( camera, object, offset, controls ) {

//     offset = offset || 1.25;

//     const boundingBox = new THREE.Box3();

//     // get bounding box of object - this will be used to setup controls and camera
//     boundingBox.setFromObject( object );

//     const center = boundingBox.getCenter();

//     const size = boundingBox.getSize();

//     // get the max side of the bounding box (fits to width OR height as needed )
//     const maxDim = Math.max( size.x, size.y, size.z );
//     const fov = camera.fov * ( Math.PI / 180 );
//     let cameraZ = Math.abs( maxDim / 4 * Math.tan( fov * 2 ) );

//     cameraZ *= offset; // zoom out a little so that objects don't fill the screen

//     camera.position.z = cameraZ;

//     const minZ = boundingBox.min.z;
//     const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;

//     camera.far = cameraToFarEdge * 3;
//     camera.updateProjectionMatrix();

//     if ( controls ) {

//       // set camera to rotate around center of loaded object
//       controls.target = center;

//       // prevent camera from zooming out far enough to create far plane cutoff
//       controls.maxDistance = cameraToFarEdge * 2;

//       controls.saveState();

//     } 

//     else camera.lookAt( center )


// }