import {NDC} from '../coordMath.js'
import tc from '@mapbox/tile-cover'
import constant from '../core/constants.js'
import {Vector3, Plane, MathUtils} from 'three'
import state from '../core/state.js'
import u from '../core/utils.js'

import TileCoordinate from './TileCoordinate.js'

// takes in tile coordinates to produce an index 0-3
// useful for load balancing workers and domain sharding


// ndc of viewport edge => lnglat
export const projectViewshed = map => {

	const coords = ndc.viewshed.map(corner => {

		const int = new NDC(...corner)
			.setMap(map)
			.toMercator()
		if (!int) console.log(corner)
		const lngLat = int.toLngLat(true);
		return [lngLat.lng, lngLat.lat]
	})

	return {type: 'Polygon', coordinates:[coords]}
}

// options object with
// zoom: zoom level at which to identify tiles
// geojson: a polygon from which to identify tiles
export const identifyTiles = o => {

	const zoom = o?.zoom;

	if (zoom === 0) return [new TileCoordinate()]

	const ring = o?.geojson;
	
	ring.coordinates[0].forEach( (ll,i)=>{

		const range = constant.mercatorRange;
		ring.coordinates[0][i] = [
			// hack to accomodate tile-cover bug with perfect 180 longitudes
			MathUtils.clamp(ll[0], -range.lng, range.lng)*0.99999999,
			MathUtils.clamp(ll[1], -range.lat, range.lat)
		]

	})

	const t = tc.tiles(ring, {min_zoom: zoom, max_zoom: zoom})
		.filter(t=>Math.sign(t[2])>=0 && t[0]< Math.pow(2, t[2]) && t[1] < Math.pow(2, t[2]))
		.map(triplet=> new TileCoordinate(...triplet))

	return t
}

export const createClippingPlanes = zxy => {

	const z = zxy[0]

	const halfWidth = constant.worldWidth/2
	const tilePos = tileOffset(zxy, halfWidth);
	const tileRadius = halfWidth / Math.pow(2, z);

	const planePositions = [
		new Vector3(0, tileRadius, 0), //n
		new Vector3(tileRadius, 0, 0), //e
		new Vector3(0, -tileRadius, 0), //s
		new Vector3(-tileRadius, 0, 0), //w
	]

	var planes = planePositions.map(p=>{
		return new Plane()
			.setFromNormalAndCoplanarPoint(
				p.clone().normalize().multiplyScalar(-1),
				p.clone().add(tilePos)
			)
	})

	return planes
}


const ndc = {

	viewshed: [
		[-1, 1],
		[1, 1],
		[1, -1],
		[-1, -1],
		[-1, 1]
	]
};