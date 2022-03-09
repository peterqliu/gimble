import V3FeatureCollection from '../geometry/V3FeatureCollection.js'
import V3Feature from '../geometry/V3Feature.js'

import Pbf from '../worker/dependencies/pbf.js'
import {vectorTile, classifyRings} from '../worker/dependencies/vectorTile.js'
import TileCoordinate from '../tile/TileCoordinate.js'

// provided tile data and its source, identify all style layers using all source layers of that source.
// returns one geometry per style layer using each of its source layers, merged across the tile

export default class Tile {

	// options
	// stylesheet: decodes only the features specified by style layers. defaults to undefined, which means all features get decoded
	// source: same
	// zxy: zxy coordinates of tile
	// onComplete: callback fn to run when decoding complete. spits out a V3FeatureCollection
	// output: geojson

	constructor(d) {
		
		this.options = d;
		this.geometriesSent = 0;

		if (d?.url) {

			var error;
			return fetch(d.url)
				.catch(e=>{if (e) {
					error = new Error(`Failed to fetch: ${d.url}`)
					
					throw error

					// return error (mostly for testing)
					return error
				}})
				.then((response, b, err) => response.arrayBuffer())
				.then(response => {

					const buffer = new Pbf(response);

					this.tile = new vectorTile(buffer);
					this.tile.zxy = d.zxy;

					// custom workflow (currently just for unit testing)
					if (this.options.customTileProcessing){
						this.options.customTileProcessing.call(this)
					}
					
					else {

						const output = this.decode()

						// streaming path
						if (d.stylesheet) {
							output
								.forEach(item=>{
									item.targetMap = d.targetMap;
									this.options.onComplete?.(item)
								})                        
						}

						// manual path
						else this.options.onComplete(this.tile)

					}



				})    
		}

	}

	// decode source layers in the tile
	// decodes all layers by default, or specified array of layers
	_decodeSourceLayers(specificSourceLayers) {

		specificSourceLayers = specificSourceLayers || Object.keys(this.tile.layers)

		specificSourceLayers.forEach(l=>{
			const currentLayer = this.tile.layers[l];

			if (!currentLayer) throw new Error(`"${l}" is not a source layer in this tile.`)
			else {
				this.tile.layers[l] = new Array(currentLayer.length)
					.fill(true)
					.map((d,i) => currentLayer.feature(i))
			}
		})
	
		return this
	}

	// geometriesSentCb: callback to execute with the number of geometries (currently used to send to geometryworker)

	decode(sourceLayerList, geometriesSentCb) {

		this._decodeSourceLayers(sourceLayerList);

		if (this.options?.stylesheet) {

			const output = [];
			const source = this.options.source;

			stylesheet.layers
				.forEach(l=>{
					if (l.source !== source) return
					const sourceLayer = l['source-layer'];
					const sourceLayerInsideTile = this.tile.layers[sourceLayer];
					
					if (sourceLayerInsideTile) {

						// decode features that pass style layer's filter
						const filterCondition = l.filter;
						const processed = this.decodeFeatures(sourceLayerInsideTile, filterCondition); 

						// update tile's source layer with (partially, depending on filter) decoded features
						this.tile.layers[sourceLayer] = processed.processed; 

						const zxy = this.options.zxy;

						const rawOutput = {

							id: l.id,
							layerType: l.type,
							source: 'tile',
							zxy: zxy,

							meshOptions: {
								anchor: zxy.getMercatorOffset(), // to position mesh
								layer: zxy.z // to set visibility layer
							},

							geometry: new V3FeatureCollection().fromTile(processed.filtered)

						}

						this.geometriesSent++
						output.push(rawOutput)
						
					}   
				})

			return output
		}

		// manual tile loads
		else {

			const outputFn = this.options.output === 'geojson' ? `projectToGeoJSON` : `featureToMercator`;

			// if no stylesheet, decode all features of all sourcelayers in tile
			const tileOffset = new TileCoordinate()
				.rebuild(this.options.zxy)
				.getMercatorOffset();

			Object.entries(this.tile.layers)
				.forEach(([k,v])=>{
					// TODO: apply tile offset to all features
					this.tile.layers[k] = v.map(vectorTileFeature => this[outputFn](vectorTileFeature, this.options.zxy, tileOffset))
				
				})
						  
		}

		if (geometriesSentCb) geometriesSentCb(this.geometriesSent)
	}


	// decode features inside a sourceLayer per a filter condition
	// returns object with a list of decoded features, and the (potentially partially decoded) original sourceLayer 
	decodeFeatures(sourceLayerInsideTile, filterCondition) {

		const zxy = this.options.zxy;

		const eligibleFeatures = new Array();

		const processed = sourceLayerInsideTile
			.map(f => {

				// if feature passes filter condition, 
				var passesFilter = !filterCondition || filterCondition(f.properties || f.p, zxy.z, [zxy.x, zxy.y])

				if (passesFilter) {

					// add feature to eligible array, decoding it if not already decoded
					const needsDecoding = f._pbf;
					const feature = needsDecoding ? this.featureToMercator(f, zxy) : f;

					if (feature) {
						eligibleFeatures.push(feature);
						return feature
					}

					else return f
				}

				else return f
			})

		return {
			filtered: eligibleFeatures, 
			processed: processed
		}

	}


	projectToGeoJSON(f, zxy) {
		return f.toGeoJSON(zxy.x, zxy.y, zxy.z)
	}

	// decode feature into v3 features
	// optionally apply tileOffset 

	featureToMercator(f, zxy, tileOffset) {

		const test = new V3Feature()
			.fromTileFeature(f, zxy, tileOffset)

		return test;
	}    
}
