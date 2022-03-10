import gimbleMap from './ui/Map'
import {LngLat, Mercator, updateProjection} from './coordMath'
import {Line, Extrusion, Sphere, Fill, Label, Circle} from './layers/mesh'
import geojson from './data/geojson'
import * as THREE from 'three'
import {manualRequest} from './tile/tileManager'
import TileSource from './tile/TileSource.js'
import {loadOBJ} from './data/loader.js'
import constant from './core/constants'

// expose three.js for users to access directly
if (window) window.THREE = THREE;

const gimble = {

	Map: gimbleMap,

	set projection(p) {
		if (p.type === 'mercator') updateProjection(p)
	},

	TileSource,
	loadTile: manualRequest.outbound,

	geojson,
	LngLat,
	Mercator,

	Sphere,
	Line, 
	Fill,
	Extrusion,
	Label,
	Circle,
	
	loadOBJ
}


export default gimble

