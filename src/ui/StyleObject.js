import constant from '../core/constants.js'
import state from '../core/state.js'
import utils from '../core/utils.js'

export default class StyleObject {

	constructor(userInput) {
		this.input = userInput || {};
	}


	fromStylesheetLayer(id) {

		this.input = state.stylesheet.layers
			.find(l=>l.id == id).style;

		return this
	}

	applyDefaults(layerType) {

		var defaults = {};

		// build object of default styles
		[...props[layerType], ...props.generic]
			.forEach(p=>{
				defaults[p] = constant.styleDefaults[p] 
			})

		this.output = utils.applyDefaults(this.input, defaults);
		
		return this.output 

	}


}

const props = {

	generic: ['color', 'renderOrder', 'translation', 'zoomLevel', 'opacity'],
	extrusion: ['height', 'base', 'bevelEnabled'],
	tube: ['sides', 'radius'],
	line: ['width'],
	label: ['color', 'fontUrl', 'text', 'size', 'billboard', 'zoomScaled', 'align', 'maxWidth', 'haloWidth', 'haloColor', 'anchorX', 'anchorY'],
	sphere: ['segments', 'radius'], 
	circle: ['radius', 'billboard', 'zoomScale', 'strokeWidth', 'strokeColor', 'blur'],
	fill: []
}


