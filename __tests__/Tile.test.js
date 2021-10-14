/**
 * @jest-environment jsdom
 */

import 'isomorphic-fetch'
import Tile from '../src/data/Tile.js'
import TileCoordinate from '../src/tile/TileCoordinate.js'
import {geojsonFeature, mercatorFeature} from './fixtures/tile.js'
import V3Feature from '../src/geometry/V3Feature.js'
describe('Tile()', () => {

	const vtFixturePath = 'http://localhost:8000/__tests__/fixtures/000.pbf'
	test('instantiate', () => {

		expect(new Tile() instanceof Tile)
			.toBe(true);

	})


	test('projectToGeoJSON', done => {

		new Tile({
			url: vtFixturePath,
			customTileProcessing: function(){

				const gjFeature = this.projectToGeoJSON(
					this._decodeSourceLayers().tile.layers.land[0], 
					{x:0,y:0,z:0}
				)

				expect(gjFeature).toEqual(geojsonFeature)
				done()
			},
			zxy: new TileCoordinate()
		})

	})

	test('featureToMercator projects tile feature to mercator space', done => {

		new Tile({
			url: vtFixturePath,
			customTileProcessing: function(){

				const gjFeature = this.featureToMercator(
					this._decodeSourceLayers().tile.layers.land[0], 
					{x:0,y:0,z:0}
				)

				expect(gjFeature).toEqual(mercatorFeature)
				done()
			},
			zxy: new TileCoordinate()
		})

	})

	test('_decodeSourceLayers', done => {

		// decode 'land' source layer only
		new Tile({
			url: vtFixturePath,
			customTileProcessing: function() {

				const partiallyDecodedTile = this._decodeSourceLayers(['land']).tile.layers;
				expect(partiallyDecodedTile.land.length ===127  && !partiallyDecodedTile.state_lines[0])
					.toBe(true)
				
				done()
			},
			zxy: new TileCoordinate()
		})		
	})

	test('decodeFeatures', done => {

		// decode features contingent on filter function

		new Tile({
			url: vtFixturePath,
			customTileProcessing: function() {

				const sourceLayerInsideTile = this._decodeSourceLayers(['land']).tile.layers.land;
				expect(this.decodeFeatures(sourceLayerInsideTile, ()=>true).filtered[0])
					.toEqual(mercatorFeature)
				expect(this.decodeFeatures(sourceLayerInsideTile, ()=>false).filtered[0])
					.toBe(undefined)
				done()
			},
			zxy: new TileCoordinate()
		})		
	})

	test('download and decode whole tile (manual)', done => {

		const oC = tile => {

			expect(Object.keys(tile.layers))
				.toEqual([
					"populated_places", 
					"country_lines", 
					"country_polygons", 
					"state_lines", 
					"land"
				]);

			// every feature of every tileLayer got decoded to a V3Feature
			expect(Object.keys(tile.layers)
				.every(key=>tile.layers[key]
					.every(item=> item instanceof V3Feature)
				)
			)
			.toBe(true)
			
			done()

			// TODO: need to test with stylesheet for streaming case

		}

		new Tile({
			url: vtFixturePath,
			onComplete: oC,
			zxy: new TileCoordinate()
		})


	})

	test('invalid tile url throws', async () => {

		await expect(()=>new Tile({
			url:'https://badtileurl.org/0/0/0.pbf',
			zxy: new TileCoordinate(),
		}))
		.rejects
		.toThrow()
		
	})

})