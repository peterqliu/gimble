import constant from '../core/constants.js'
import V3Feature from '../geometry/V3Feature.js'
import V3FeatureCollection from '../geometry/V3FeatureCollection.js'
import {LngLat} from '../coordMath.js'
import flatten from '@turf/flatten'
class GeometryLike {

	constructor(o) {
		this.input = o.constructor.name === 'Object' ? flatten(o) : o;

	}

	// takes input geometry, converts to V3Feature, computes style, flattens it,
	// explodes it down to the desired dimension

	prepareForType(t, style, zxy){

		var rawGeometry;
		const g = this.input;

		// if input is already V3Feature

		if (g instanceof V3Feature) rawGeometry = this.flattenMultiGeometry(g.computeStyle(style, zxy));

		else if (g instanceof V3FeatureCollection) {
			rawGeometry = [];
			g.iterateFeatures(f => rawGeometry.push(...this.flattenMultiGeometry(f.computeStyle(style, zxy))))
		}

		else if (g instanceof LngLat) {
			rawGeometry = [new V3Feature().fromLngLat(g)]
		}
		
		// if input is geojson

		else {

			const isFC = g.type === 'FeatureCollection';

			if (isFC) {
				// compute the style of every feature and flatten them down 
				rawGeometry = [];

				new V3FeatureCollection(g)
					.iterateFeatures(
						f => rawGeometry.push(f.computeStyle(style, zxy))
					)

			}

			else rawGeometry = new V3Feature(g).computeStyle(style, zxy)

		}

		const outputDimension = constant.geometry.dimensions[t];
		return this.coerceDimension(rawGeometry, outputDimension);
	}


	flattenMultiGeometry(geometry) {

		if (!(geometry instanceof V3Feature)) console.warn('flattenMultiGeometry: input is not instance of V3Feature ')
		if (geometry.multi) {

			const deMultied = geometry.g
				.map(subGeometry => new V3Feature().rebuild({
					type: geometry.type.replace('Multi', ''),
					g: subGeometry,
					p: geometry.p,
					s: geometry.s,
					multi: false,
					foo:true,
					dimension: geometry.dimension - 1
				}))

			return deMultied
		}

		else return [geometry]

	}

	// meta function that takes an array of features
	// and converts them into the dimension required.
	// filters out features that are too low, and reduces
	// features that are too high.

	coerceDimension (fts, dimension) {

		const c = fts
			.filter(f => f.dimension >= dimension)
			.map( f => this.reduceDimension(f, dimension))
			.flat();

		return c
	}

	// reduce dimension to the necessary level
	reduceDimension (f, outputType) {

		if (f.multi) {
			console.warn(`Flatten multigeometry before reducing`, f)
			return
		}


		// Dimension differential between feature and desired format
		const differential = f.dimension - outputType;

		if (differential > 2) console.warn(`differential of `, differential, '. strange.')
		else if (differential < 0) console.warn('input geometry smaller than desired dimension')
		
		else if (differential > 0) {

			const output = [];

			const exploded = this._explode(f, outputType)
				.forEach(sub=>{

					if (sub.dimension === outputType) output.push(sub)
					if (differential === 2) {
						this._explode(sub, outputType)
							.forEach(grandsub=>output.push(grandsub));
					}
				})

			output.forEach(g=>{
				delete g.multi
				// delete g.dimension
			})

			return output
		
		}

		// for exact dimension matches, simply return the input feature
		else {
			
			// delete f.type;
			// delete f.dimension;
			delete f.multi;

			return f;

		}

	}

	// reduce higher-dimension geometries to one step lower (polygon -> linestring -> point)
	
	_explode(f, outputDimension) {

		const explodedFeatures = f.g
			.map(subFeature => new V3Feature()
				.rebuild({
					g: subFeature,
					p: f.p,
					s: f.s,
					multi: false,
					dimension: f.dimension - 1,

				})
			)

		return explodedFeatures

	}

}

export default GeometryLike