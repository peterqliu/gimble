import constant from './core/constants.js'
import {
	Vector2,
	Vector3,
	MathUtils,
	Plane,
	Ray,
	Raycaster
} from 'three'
import * as THREE from 'three'

import sphericalMercator from "@mapbox/sphericalmercator"
import state from './core/state.js'
import utils from './core/utils.js'

// keep lnglat to 6 decimal places
const subpixelResolution = 1000000;

export const sm = new sphericalMercator({size: 360 * subpixelResolution});
const coordValidate = {

	type: ['array', 'object'],

	value: v => {

		const firstArg = v[0];

		if (Array.isArray(true)) {
			return v.every(n=>typeof n === 'number')
		}

		else if (typeof v === 'object') {
			return Object.values(v)
				.every(n => typeof n === 'number')
		}

		else return false
	}
}

export class LngLat {

	constructor(...ll) {

		const p = coordinateOmnivore(...ll);

		if (p instanceof LngLat) Object.assign(this, p)
		else [this.lng, this.lat, this.alt] = [p.x, p.y, p.z ?? 0]

	}

	setMap(map) {
		this.map = map;
		return this
	}

	toArray() {
		return [this.lng, this.lat]
	}

	toVector3() {
		return new Vector3(this.lng, this.lat, this.alt ?? 0)
	}

	toMercator() {

		const {extent, origin, _originShift} = constant.projection;
		const normalizedOrigin = this.toArray()
			// .map((d,i)=> d-origin[i])
		const px = sm.px(normalizedOrigin, 0)
			.map(c=>c/subpixelResolution)

		const m = new Mercator([
			extent * (px[0]/360 - _originShift[0]), 
			-extent * ( px[1]/360 - _originShift[1]), 
			this.alt ? this.mercatorScale() * this.alt : this.alt
		])
		.setMap(this.map)
		return m

	}

	// to screen px
	toPoint() {
		const m = this.toMercator()
			.toPoint();

		return m;

	}

	// scale of object at position, 
	// to match local mercator distortion (normalized to 1 at equator)
	mercatorScale() {
 		return 1 / Math.cos(MathUtils.degToRad(this.lat))
	}

	// interpret lnglat as a map center and 
	// return the position the world object needs to be
	_toWorldPosition(zoom) {

		const zoomScale = Math.pow(2, zoom);

		return this
			.toMercator()
			.multiplyScalar(-zoomScale);			
	}

}

// an object with XYZ values representing coordinates in scene space

export class Mercator extends THREE.Vector3 {

	constructor(...xyz) {

		const p = coordinateOmnivore(...xyz);

		super(p.x, p.y, p.z ?? 0)

	}

	setMap(map) {
		this.map = map;
		return this
	}

	// to lnglat
	toLngLat(clamp) {
		const {x, y} = this;
		const {extent, origin} = constant.projection;

		// scale world units back to 360 width, so it could be used with sm instance
		const adjustedPosition = ([
			x + extent/2,
			-y + extent/2
		]).map(c=>c*subpixelResolution*360/extent);

		var lngLat = sm.ll(adjustedPosition, 0)
			.map((d,i)=>d + origin[i]);

		if (clamp) {
			const {maxLng, maxLat} = constant.projection;
			lngLat = [
				MathUtils.clamp(lngLat[0], -maxLng, maxLng),
				MathUtils.clamp(lngLat[1], -maxLat, maxLat)
			]

		}

		return new LngLat(lngLat)

	}

	// to screen px
	toPoint() {

		const projected = this.map.world
			.localToWorld(this.clone())
			.project(this.map.camera);

		const pt = new NDC(projected.x, projected.y)
			.setMap(this.map)
			.toPoint()
			.setMap(this.map);

		return pt

	}

	toSceneSpace(map) {
		
		return map.world.localToWorld(this.clone())

	}

	_asWorldPositionToLngLat(z) {

		return this.clone()
			.multiplyScalar(-Math.pow(0.5, z))
			.toLngLat()	

	}

}

// an object with X-Y values representing a pixel coordinate on the screen

export class Point extends Vector2 {
	
	constructor(...xy) {
		super(...xy);
	}

	setMap(map) {
		this.map = map;
		return this
	}

	fromMouseEvent(e) {

		this.x = e.offsetX;
		this.y = e.offsetY;
		
		return this

	}	

	//mouse event -> normalized device coords
	toNDC() {

		const c = this.map.state.getU('viewportSize');

		var ndc = new NDC(
			( this.x / c.x ) * 2 - 1,
			- ( this.y / c.y ) * 2 + 1
		).setMap(this.map);

		return ndc

	}

	toMercator() {
		var mc = this.toNDC()
			.toMercator();

		return mc;
	}


	toLngLat(clamp) {
		const m = this.toMercator();
		return m.toLngLat(clamp);
	}

	toArray(){
		return [this.x, this.y]
	}
}

// an object with X-Y values representing normalized device coordinates,
// each ranging from -1 to 1

export class NDC extends Vector2{

	constructor(...xy) {
		super(...xy)
	}

	setMap(map) {
		this.map = map;
		return this
	}

	toPoint() {

		const c = state.uniforms.viewportSize.value;
		var vp = new Point(
			c.x * (this.x + 1)/2,
			c.y * (this.y + 1)/2,
		);

		return vp

	}

	toMercator(_sceneUnits) {

		const {camera} = this.map;

		//set ray to start where the camera is
		ray.origin
			.setFromMatrixPosition(camera.matrixWorld);	

		//set direction relative to ray's origin
		ray.direction
			.set( this.x, this.y, 0.5 )
			.applyMatrix4( camera.projectionMatrixInverse )
			.applyMatrix4( camera.matrixWorld )
			.sub( ray.origin )
			.normalize();

		var intersectPt = new Mercator();

		const intExists = ray
			.intersectPlane(referencePlane, intersectPt);	

		if (!intExists) console.log(this)
		if (intExists) return _sceneUnits ? intExists : this.map.world.worldToLocal(intExists)
		else return undefined
	
	}

}


// takes a variety of coordinate inputs,
// and returns a value in xyz object format
// accepts no args, an object, an array, or a list of numbers
const coordinateOmnivore = (...input) => {

	var firstArg = input[0];

	// if empty

	if (input.length === 0) return {x:0, y:0, z:0}

	// if just one argument an xyz object
	else if (input.length === 1) {

		// if an array
		if (Array.isArray(firstArg)) {
			const v = utils.validateOnce(firstArg, coordValidate, 'coord')
			return {x:v[0], y:v[1], z:v[2]}
		}

		// if an object
		else return utils.validateOnce(firstArg, coordValidate, 'coord')

	}

	
	// if a list of numbers
	else {
		const v = utils.validateOnce([...input], coordValidate);
		return {x:v[0], y:v[1], z:v[2] ?? 0}
	}

}

export function intersect(point, object) {

	//calculate mouse coords
	var mouseCoords = point.ndc;

	raycaster.setFromCamera(mouseCoords, this.camera);
	
	const fn = object.length ? 'intersectObjects' : 'intersectObject'
	return raycaster[fn](object, true) 

}

export const updateProjection = p => {
	constant.projection = {
		...constant.projection,
		...p,
		_originShift: p.origin ? sm.px(p.origin, 0)
			.map(c=>(c/(subpixelResolution*360))) : constant.projection._originShift
	}
}
export const referencePlane = new Plane(new THREE.Vector3(0,0,1))

const ray = new Ray();
const raycaster = new Raycaster();


