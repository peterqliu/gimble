import {LngLat} from '../coordMath.js'
import {vectorTile, classifyRings} from '../worker/dependencies/vectorTile.js'
import constant from '../core/constants.js'
import {Color, Vector3} from 'three'

// a Mercator expression of a geojson feature.
// also has methods to compute style from style object (more efficient to do this before flattening/exploding later) 
export default class V3Feature {

	constructor(geojsonFeature) {

		if (geojsonFeature) {

			var dimension = constant.geojsonTypes
				.indexOf(geojsonFeature.geometry.type.replace('Multi', ''));

			const isMulti = geojsonFeature.geometry.type.includes('Multi');

			if (isMulti) dimension++

			Object.assign(this, {
				type: geojsonFeature.geometry.type,
				dimension: dimension,
				g: this._deepProject(geojsonFeature.geometry.coordinates, a=>new LngLat(a).toMercator()),
				p: geojsonFeature.properties,
				s: {},
				multi: isMulti
			})

		}
	}

	_deepProject(array, projectionFn) {

		const isCoordinatePair = array
			.every(c=> typeof c === 'number');	

		if (isCoordinatePair) return projectionFn(array)
		else return array.map(a=>this._deepProject(a, projectionFn))	
	}

	fromLngLat(ll) {
		Object.assign(this, {
			type: 'Point',
			dimension: 1,
			g: ll.toMercator(),
			s: {}
		})

		return this
	}

	fromTileFeature(f, zxy, tileOffset) {

		var coords = f.loadGeometry();

		// filter out points that are beyond tile limit
		if (f.type === 1 ) {
			if (coords[0][0].x<0 || coords[0][0].y<0 || coords[0][0].x>f.extent || coords[0][0].y>f.extent)
			return
		}

        switch (f.type) {
            case 1:
                var points = [];
                for (var i = 0; i < coords.length; i++) {
                    points[i] = coords[i][0];
                }
                coords = points;
                break;

            case 2: break;

            case 3:
                coords = classifyRings(coords);
                break;
        }

        var isMulti;

        if (coords.length === 1) coords = coords[0];
        else isMulti = true;



        // calculate tile width in scene size
        const tileWidth = constant.worldWidth / Math.pow(2, zxy.z);


        // project feature geometry to vector3's normalized to the center of its tile
        Object.assign(this, {
        	type:`${isMulti ? 'Multi' : ''}${constant.geojsonTypes[f.type]}`,
        	dimension: isMulti ? f.type + 1 : f.type,
        	multi: isMulti,
        	p: f.properties,
        	g: this._tileCoordsToV3(coords, tileWidth, f.extent, tileOffset)
        })

		return this
	}

    // given px coords within a tile, 
    // recurse into the feature to return v3
    // optionally apply tile translation to coordinate
    _tileCoordsToV3(coords, tileWidth, extent, tileOffset) {

        const isNotXYPair = isNaN(coords.x) || isNaN(coords.y);
        if (isNotXYPair) return coords.map(a => this._tileCoordsToV3(a, tileWidth, extent, tileOffset))

        else {

            const withinTile = new Vector3(
            	coords.x / extent - 0.5,
				0.5 - coords.y / extent,
				0
			).multiplyScalar(tileWidth)

            if (tileOffset) withinTile.add(tileOffset)
            return withinTile
        }

    }

	// reconstruct a V3Feature from in input object
	rebuild(input) {
		Object.assign(this, input)
		return this		
	}

	// compute all style functions into literals
	// by default, skips literal color values since they 
	// will be implemented as a material uniform rather than vertexColors
	
	computeStyle(styleObj, zxy = {x:0, y:0, z:0}, keepHardcodedColor) {

		const output = {}
		
		Object.entries(styleObj)
			.forEach(([k,v]) => {

				if (k === 'color' && typeof v !== 'function' && !keepHardcodedColor) return
				const computedValue = this.computeStyleValue(v, zxy.z, [zxy.x, zxy.y]);
				// const needToCoerceColor = k.toUpperCase().includes('COLOR');

				output[k] = computedValue;
			})


		this.s = output
		return this	
	}

	computeStyleValue(value, z, xy) {

		if (typeof value !== 'function') return value
		
		const computed = value.apply(
			undefined, 
			[this.p, z, xy]
		);

		return computed
	}	

	_makeShape() {

		const rings = this.g;

		const makePath = ring => {
			const path = new THREE.Shape();

			for (var p = 0; p<ring.length; p++){
				const pt = ring[p]
				if (p===0) path.moveTo(pt.x, pt.y)
				else path.lineTo(pt.x, pt.y)
			}			

			return path
		};

		const outerRing = rings[0]
		var shape = makePath(outerRing);

		// add holes to ring
		for (var i=1; i<rings.length; i++) {
			const hole = rings[i];
			shape.holes.push(makePath(hole))
		}

		return shape
	}
}

