import {
	get,
	set,
	MapAnimation,
} from './mapControl.js'


import {
	// world, 
	// renderer, 
	// camera, 
	setup, 
	container, 
} from './threeSetup.js'

import {
	Point,
	Mercator 
} from '../coordMath.js'

import state from '../core/state.js'
import constant from '../core/constants.js'
import {MathUtils, Vector2, Vector3} from 'three'

export const EventTarget = {};


export const EventManager = {

	mouseMoved: false,
	event:{},

	addListener: (event, cb, mapObject) => {

		mapObject.setup.renderer.domElement
			.addEventListener(event, e=> {
				if ( eventConditions[event] ? eventConditions[event]() : true) cb(new MouseEvent(e, event, mapObject))
			})

	},

	dispatch: (dE, event) => dE.dispatchEvent(EventManager.event[event])
}

// custom conditions for mouse behavior

const eventConditions = {

	// ensures that the cursor hasn't moved since mousedown
	click: () => !EventManager.mouseMoved

}

export class MouseEvent {

	constructor(e, event, map) {

		Object.assign(this, {
			originalEvent: e,
			point: new Point(e.offsetX, e.offsetY).setMap(map),
			type: event,
			map: map
		})

	}

	get lngLat() { return this.point.toLngLat() }

	get mercator() { return this.point.toMercator() }

	get ndc() { return this.point.toNDC() }

}

const mapEvents = [

	'movestart', 'move', 'moveend', 
	'dragstart', 'drag', 'dragend',
	'zoomstart', 'zoom', 'zoomend',
	'pitchstart', 'pitch', 'pitchend',
	'rotatestart', 'rotate', 'rotateend'

];

var mapping = {
	wheel: 'scrollZoom',
	leftDrag: 'dragPan',
	rightDrag: 'dragRotate'
}

var mapInstance;

const cursorActions = {

	scrollZoom: e => {

		const intersect = checkIntersection(new MouseEvent(e, 'zoom', mapInstance));

		if (intersect) {
	
			MapAnimation.stop.call(mapInstance);

			const d = e.wheelDeltaY;
			const deltaZoom = Math.sign(d) * Math.pow(Math.abs(d),1.1) / state.quotient.zoomWheel;
			const z = MathUtils.clamp(get.zoom() + deltaZoom, 0, 22);

			// update world position directly,
			// and flag coreLoop to update world
			const wP = intersect.toSceneSpace(mapInstance)
				.sub(intersect.multiplyScalar(Math.pow(2,z)));

			// set zoom
			set.zoom.call(mapInstance, z);
			set.center.call(mapInstance, wP._asWorldPositionToLngLat(z), wP)

			mapInstance.loop
				.rerender()

		}
		
	},

	dragPan: e => {

		MapAnimation.stop();

		const intersect = e.point
			.toMercator(mapInstance)
			.toSceneSpace(mapInstance);

		var delta = intersect
			.clone()
			.sub(state.interaction.lastInt);

		state.interaction.lastInt
			.copy(intersect);

		state.camera.worldPanDelta
			.add(delta);

		mapInstance.loop
			.updateWorld();

	},

	dragRotate: e => {

		checkIntersection(e)

		// pitch
		const deltaPitch = -e.originalEvent.movementY / state.quotient.pitchDrag;
		set.pitch.call(mapInstance, MathUtils.clamp(get.pitch() + deltaPitch, 0, 60))
		
		// bearing
		const deltaBearing = - e.originalEvent.movementX / state.quotient.bearingDrag;

		set.bearing.call(mapInstance,(get.bearing() + deltaBearing) % 360);
			
	}
}

export const bindGestures = (mappingOptions, map) => {

	const dE = map.renderer.domElement;
	mapInstance = map;

	// set up map events

	for (event of mapEvents) {

		EventManager.event[event] = new Event(event);

		if (defaultBehavior[event]) dE.addEventListener(event, defaultBehavior[event])
	}	


	// selectively override mouse gesture defaults with user parameters
	// a false for the whole value removes all mappings and thus all controls

	mapping = mappingOptions === false ? {} : Object.assign(mapping, mappingOptions)

	// bind default gestures (not related to custom user gestures)

	Object.keys(mouseEvents)
		.forEach(event => dE.addEventListener(event, mouseEvents[event]))

	// handle resize
	window
		.addEventListener( 'resize', defaultBehavior.resize, false );

	state.camera.worldPanDelta = new Mercator();

}

// mouse events to bind to the canvas domElement
const mouseEvents = {

	mousedown: e => {

		EventManager.mouseMoved = false;
		checkIntersection(new MouseEvent(e, 'mousedown', mapInstance))

	},
	
	mousemove: e => {

		const event = new MouseEvent(e, 'mousemove', mapInstance);

		if (e.which === 1) {
			if (e.ctrlKey) cursorActions[mapping.rightDrag]?.(event);
			else cursorActions[mapping.leftDrag]?.(event);
		}			

		else if (e.which === 3) cursorActions[mapping.rightDrag]?.(event);

		EventManager.mouseMoved = true;

	},

	wheel: e => cursorActions[mapping.wheel]?.(e),

	contextmenu: e => e.preventDefault(),
}


const defaultBehavior = {

	// map movements
	movestart: e => mapInstance.loop.updateTiles(),
	
	moveend: e => {
		mapInstance.loop.updateTiles();
		if (state.startSettings.hash) setHash()
	},

	move: e => mapInstance.loop.updateTiles(),

	resize: () => {

		var [x,y] = [container.clientWidth, container.clientHeight];
		setup.setViewportSize.call(mapInstance, x,y);
		mapInstance.loop
			.rerender()
			.updateTiles()

	}
	

}

const checkIntersection = e => {

	const intersect = e.mercator;

	state.interaction.lastInt = intersect.toSceneSpace(mapInstance);
	return intersect;
}

const setHash = () => {

	window.location.hash = [
		get.zoom().toFixed(2), 
		...get.center()
			.toArray()
			.reverse()
			.map(n=>n.toFixed(6)), 
		get.bearing().toFixed(2), 
		get.pitch().toFixed(2)
	].join('/');

}

export const dispatchEvents = dE => {

	const lD = state.interaction.lastDispatch;
	var noChange = lD > state.interaction.lastMove;
	var wasMoving = state.interaction.isMoving;

	const stillStatic = !wasMoving && noChange;

	// was static, is static
	if (stillStatic) return

	else {

		const i = state.interaction;
		const now = state.getU('now');

		const isDragging = i.lastDrag >= lD;
		const isZooming = i.lastZoom >= lD;
		const isPitching = i.lastPitch >= lD;
		const isBearing = i.lastBearing >= lD;

		// if wasMoving but noChange since last dispatch, 
		if (noChange) {

			EventManager.dispatch(dE, 'moveend')

			if (i.wasDragging) EventManager.dispatch(dE, 'dragend')
			if (i.wasPitching) EventManager.dispatch(dE, 'pitchend')
			if (i.wasZooming) EventManager.dispatch(dE, 'zoomend')
			if (i.wasBearing) EventManager.dispatch(dE, 'rotateend')

			state.interaction.wasPitching = state.interaction.wasZooming = state.interaction.wasBearing = false;

		}

		// if there is a change, fire movestart/move depending whether it was moving before
		else {

			EventManager.dispatch(dE, wasMoving ? 'move' : 'movestart')

			if (isDragging) EventManager.dispatch(dE, i.wasDragging ? 'drag' : 'dragstart') 
			else if (i.wasDragging) EventManager.dispatch(dE, 'dragend')

			if (isZooming) EventManager.dispatch(dE, i.wasZooming ? 'zoom' : 'zoomstart') 
			else if (i.wasZooming) EventManager.dispatch(dE, 'zoomend')

			if (isPitching) EventManager.dispatch(dE, i.wasPitching ? 'pitch' : 'pitchstart')
			else if (i.wasPitching) EventManager.dispatch(dE, 'pitchend'); 

			if (isBearing) EventManager.dispatch(dE, i.wasBearing ? 'rotate' : 'rotatestart')
			else if (i.wasBearing) EventManager.dispatch(dE, 'rotateend'); 

		}

		state.interaction.wasDragging = isDragging
		state.interaction.wasPitching = isPitching
		state.interaction.wasZooming = isZooming
		state.interaction.wasBearing = isBearing

		state.interaction.isMoving = !noChange;

		state.interaction.lastDispatch = now;
	}

}