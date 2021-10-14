import V3Feature from './V3Feature.js'

export default class V3FeatureCollection {

	constructor(geojson) {
		if (geojson) {
			this.geojson = geojson;
			this.g = geojson.features.map(f=>new V3Feature(f));
		}

	}

	fromTile(t) {
		this.g = t.map(f=> new V3Feature().rebuild(f));
		return this
	}

	// reapply class methods lost in worker transfer
	// to both the collection and its features
	rebuild(V3FC) {

		V3FC.g
			.forEach(
				(f,i) => V3FC.g[i] = new V3Feature().rebuild(f)
			)
			
		this.g = V3FC.g;
		return this
	}

	iterateFeatures(fn) {
		this.g.forEach(f=>fn(f))
		return this
	}

	// return a new V3FeatureCollection containing
	// a subset of features that meet a filter criterion
	filterFeatures(filterFn) {

		const whitelist = this.g.filter(ft=>filterFn(ft.p));
		return new V3FeatureCollection().rebuild({g: whitelist})

	}

	// returns a new v3fc of features contained by this and another v3fc.
	// does not change either original objects
	concatFeatures(V3FC) {

		return new V3FeatureCollection().rebuild({g:this.g.concat(V3FC.g)})
	}
}
