import state from '../core/state.js'
import constant from '../core/constants.js'

import {
	projectViewshed,
	identifyTiles, 
	createClippingPlanes,
} from './tileMath.js'

import {Primitive} from '../layers/mesh.js'
import {rebuildGeometry} from '../worker/makeGeometry.js'
import {addToWorld} from '../ui/threeSetup.js'
import workers from '../worker/workers.js'
import {updateCameraLayer} from '../ui/mapControl.js'

// fetcher can respond with:
// 1) geometries to ancipate, in order to determine render completion
// 2) label/circle geometries from streamed tile
// 3) decoded vector tile, in response to manual tile loading

workers.onFetcherResponse = d => {

	if (d.anticipate) {

		state.tile.geometriesCurrentlyAnticipating += d.anticipate.geometries;
		state.tile.currentlyAnticipating--;

		// checkLoadingCompleteness();

	}

	// as response to loadTile
	else if (d.manualTileLoad) manualRequest.inbound(d.manualTileLoad)

}

workers.onGeometryResponse = d => {


	const data = d.complete;

	// if (!data.skipCount) state.tile.geometriesCurrentlyAnticipating--;

	if (!data.aborted) {

		var mesh;

		if (data.layerType ==='label' || data.layerType ==='circle') mesh = new Primitive().fromTile(data)

		else {
		    data.geometry = rebuildGeometry(data);
		    mesh = new Primitive().fromTile(data)
		}

		const targetMap = workers.targets[data.targetMap];

		addToWorld.call(targetMap.setup, mesh)
	}
}


// check whether all items are loaded, and update camera layer
const checkLoadingCompleteness = () => {

	if (state.tile.geometriesCurrentlyAnticipating<0 && state.tile.currentlyAnticipating === 0) console.warn('subzero', state.tile.geometriesCurrentlyAnticipating)
	
	const readyToUpdate = state.camera.deferredCameraLayerUpdate && state.tile.currentlyAnticipating === 0 && state.tile.geometriesCurrentlyAnticipating ===0;
	if (readyToUpdate) {
		updateCameraLayer();
		state.camera.deferredCameraLayerUpdate = false;
	}

}


export const updateTiles = map => {
	
	state.tile.needUpdate = false;
	
	const tileCoords = identifyTiles({
		geojson: projectViewshed(map), 
		zoom: state.interaction.lastIntegerZoom
	});
	
	if (visibleTiles.haveChanged(tileCoords)) {

		visibleTiles.communicate();

		if (state.stylesheet) {
			tileCoords
				.forEach(tc => {
					state.tile.currentlyAnticipating++
					Object.keys(state.stylesheet.sources)
						.forEach(source => getTile(tc, source, map.id))
				})
		}

	}

}

const visibleTiles = {

	// returns boolean whether visibility of tiles has changed since previous, and updates the state

	haveChanged: tileCoords => {

		const tileStr = tileCoords.map(t=>t.toCacheKey()).join(',');

		if (state.tile.currentlyVisible === tileStr) return false

		else {
			state.tile.currentlyVisible = tileStr;
			return true
		}
	},

	// pass visibleTile state to workers
	communicate: () => {

		const msgPayload = {
			visibleTiles: {
				tiles: state.tile.currentlyVisible,
				timestamp: Date.now()
			}
		}

		// geometryPool.postAll(msgPayload)
		workers.fetcher.postAll(msgPayload)

	}
}


// Main object to fulfill tile requests from TileSource.loadTile()
// on each request, uses lookup key to stash tile tracker and callback function(s) in a cache
// passes lookup along with the request to the fetcher worker (outbound),
// so that the worker can return the lookup, in order to retrieve the cached callback (inbound)
// when all tiles have been accounted for, fire onAllTiles() and delete the cached entry

export const manualRequest = {

	callbacks: {},

	write: (key, entry) => manualRequest.callbacks[key] = entry,
	erase: key => delete manualRequest.callbacks[key],
	retrieve: key => manualRequest.callbacks[key],

	outbound: tileOptions => {

		const targetWorker = tileOptions.zxy.tileCoordsToQuads();
		workers.fetcher.postTo(
			{manualTileLoad: tileOptions},
			targetWorker
		)		
	},

	// on response from fetcher, look up and execute the stored callback functions
	inbound: o => {

		const cbEntry = manualRequest.retrieve(o.lookupKey);
		if (!cbEntry) console.warn('No callbacks found for', o.lookupKey, o.tile)

		// rebuild tile if needed
		o.tile = cbEntry.rebuildFn?.(o.tile) || o.tile;

		// per-tile callback if needed
		cbEntry.onTile?.(o.tile);

		//assemble list of tiles if needed, and decrement the count of outstanding requests
		if (cbEntry.onAllTiles) cbEntry.tiles.push(o.tile)
		cbEntry.count --;

		// when complete, fire onAllTiles if specified, and delete entry from cache
		if (cbEntry.count === 0) {
			cbEntry.onAllTiles?.(cbEntry.tiles);
			manualRequest.erase(o.lookupKey);

		}

	}


}

// // given tile coord and source, download the buffer
const getTile = (tc, source, mapId) => {

	workers.fetcher.postTo(
		{
			s: source,
			c: tc, 
			targetMap: mapId,
			// u: url,
			diagnostic: {
				mark: Date.now()
			}
		},

		tc.tileCoordsToQuads()
	);
}



export const cache = {}