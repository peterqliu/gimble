import state from './core/state.js'

import workerPool from './worker/workers.js'
import {stringifyFn, deepStringify} from './workerPool.js'
import constant from './core/constants.js'


import StyleObject from './ui/StyleObject.js'
import geojson from './data/geojson.js'

const mapStyle = {

	init: (style, cb) => {

		if (typeof style === 'string') geojson(style, (err, json) => mapStyle.parseStylesheet(json, cb))
		else mapStyle.parseStylesheet(style, cb)

	},

	parseStylesheet(stylesheet, cb) {

		state.stylesheet = stylesheet;

		var stylesheet = deepStringify(stylesheet)

		stylesheet.sourceLayersUsed = {};

		// iterate through style layers
		for (var layer of stylesheet.layers) {

			const sourceName = layer.source;
			const sourceObj = stylesheet.sources[sourceName];

			// if layer has a vector source
			if (sourceObj) {

				const url = sourceObj.url;
				const sourceLayer = layer['source-layer'];

				stylesheet.sourceLayersUsed[sourceName] = stylesheet.sourceLayersUsed[sourceName] || {
					[sourceLayer]: []
				};

				stylesheet.sourceLayersUsed[sourceName][sourceLayer] = stylesheet.sourceLayersUsed[sourceName][sourceLayer] || [];
				stylesheet.sourceLayersUsed[sourceName][sourceLayer].push(layer)

			}
			
			else console.warn(`Layer "${layer.id}" refers to a nonexistent source "${sourceName}"`)
			
		    layer.style = new StyleObject(layer.style)
		    	.applyDefaults(layer.type)

		}

		workerPool.fetcher
			.define({stylesheet: stylesheet})

		workerPool.geometry.define({
			stylesheet:stylesheet,
			constant:constant
		})

		cb()
	}
}

export default mapStyle;
