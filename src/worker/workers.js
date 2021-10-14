import constant from '../core/constants.js'
import {setUpGeometryPool} from './makeGeometry.js'
import {setUpFetcherPool} from './fetchTile.js'

const workers = {

	init: () => {

		if (workers.ready) return workers

		const fetcherGeomChannels = []
		const pairwiseWorkers = constant.workers.fetcher * constant.workers.geometry;

		for (var i = 0; i<pairwiseWorkers; i++) fetcherGeomChannels.push(new MessageChannel())

		Object.assign(workers, {
			fetcher: setUpFetcherPool(fetcherGeomChannels)
				.onMessage(workers.onFetcherResponse),
			geometry: setUpGeometryPool(fetcherGeomChannels)
				.onMessage(workers.onGeometryResponse)
		})

		workers.ready = true;

		return workers
	},

	targets:{}

}

export default workers