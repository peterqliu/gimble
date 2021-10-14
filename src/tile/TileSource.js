import state from '../core/state.js'
import {identifyTiles} from './tileMath.js'
import {manualRequest} from './tileManager.js'
import V3FeatureCollection from '../geometry/V3FeatureCollection.js'
import utils from '../core/utils.js'
const domainShards = ['a', 'b', 'c', 'd']


const buildUrlRoot = url => {
	if (url.includes('mapbox://')) return url.replace('mapbox://', 'https://{domainShard}.tiles.mapbox.com/v4/')
	else return url
}

const tileSourceInput = {
	
	type: {
		type: 'string'
	},

	tiles: {
		type: ['string', 'function'],
		required: true
	},

	tileLimit: {
		type: 'number',
		value: v => v >= 0
	},

	_required: true
}

const loadAreaInput = {

	maxTiles: {
		type: ['number'],
		value: v => v >= 0
	},

	zoom:  {
		type: ['number'],
		value: v => v >= 0 && v%1 === 0
	},

	geojson: {
		type: ['object'],
		required: true
	},

	_required: true

}

const cbEntryInput = {

	output: {
		type: ['string'],
		oneOf: ['geojson', 'mercator']
	},

	onTile: {
		type: ['function']
	},

	onAllTiles: {
		type: ['function']
	}

}

export default class TileSource {

	// options
	// type: must be 'vector'
	// tiles: could be a url string template, or a function producing tile urls from TileCoordinate
	constructor(options) {

		const o = utils.validate(options, tileSourceInput);
		this.type = o.type;
		this.tiles = o.tiles;
		this.tileLimit = 15;
		this.formUrl = typeof o.tiles === 'string' ? this._defaultUrlTemplater : o.tiles;

	}

	// specify area to load
	// selectionOptions: object with keys 
	// geojson: geojson of desired area. 
	// and zoom. zoom defaults to 0, and geojson defaults to the current map view
	// 
	// cbEntry:
	// output: format of returned tile. default is 'Mercator'. 'geojson' also available
	// onTile: callback function to execute on each tile as it returns. same callback will execute for all tiles in this request
	// onAllTiles: callback to execute when all tiles return. Returns an array of all tiles.
	
	loadArea(sO, cbE) {

		var [selectionOptions, cbEntry] = [utils.validate(sO, loadAreaInput), utils.validate(cbE, cbEntryInput)]
		let tiles = identifyTiles(selectionOptions);
		const maxTiles = selectionOptions.maxTiles || 15;

		if (tiles.length > maxTiles) {
			console.warn(`There are ${tiles.length} tiles in the selected area at zoom ${selectionOptions.zoom}, but only ${maxTiles} will be requested per the current maxTiles setting. Consider raising this value.`)
			tiles = tiles.slice(0, maxTiles)
		}

		const lookupKey = `r${Math.random()}`;

		cbEntry = {...cbEntry, ...{
			count: tiles.length,
			tiles:[],
			rebuildFn: cbEntry?.output === 'geojson' ? undefined : this._rebuildTileFn
		}}

		// log the callbacks into the requester
		manualRequest.write(lookupKey, cbEntry);

		// request tiles 
		tiles
			.map(t=> this._createTileRequest(t, lookupKey, cbEntry.output))
			.forEach(request=>manualRequest.outbound(request))

	}

	// specify tile to load
	loadTile(zxy, cbEntry) {

		const tileRequest = this._createTileRequest(zxy);
		tileOptions.lookupKey = cbEntry.lookupKey;

		manualRequest.outbound(cbEntry, tileRequest);

	}

	// form the request specifying tile url and coordinates
	_createTileRequest(zxy, lookup, format) {

		const url = this.formUrl(zxy);

		const tileOptions = {
			url: url,
			zxy: zxy,
			lookupKey: lookup,
			output: format
		};

		return tileOptions
	}

	_defaultUrlTemplater(zxy) {
		const url = this.tiles
			.replace('{z}', zxy.z)
			.replace('{x}', zxy.x)
			.replace('{y}', zxy.y);

		return url
	}

	// rebuild V3FeatureCollection for each layer of the tile

	_rebuildTileFn(tile) {

		Object.keys(tile.layers)
			.forEach(k=>{
				tile.layers[k] = new V3FeatureCollection().rebuild({g:tile.layers[k]})
			});

		return tile
	}
}