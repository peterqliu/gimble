import * as THREE from 'three'

const constant = {

	worldWidth: 40075000,
	mercatorRange: {
		lng: 180,
		lat: 85.05113
	},

	geojsonTypes: ['Unknown', 'Point', 'LineString', 'Polygon'],

	geometry:{
		dimensions:{
	        fill: 3,
	        extrusion: 3,
	        tube: 2,
	        line: 2,
	        label: 1,
	        sphere:1,
	        circle:1
	    }
	},

	systemDefaults: {
		antialias: true
	},

	workers: {
		fetcher:4,
		geometry:4
	},

	styleDefaults: {

		color: 'black',
		renderOrder: 0,
		translation: undefined,
		zoomLevel: undefined,

		opacity: 1,
		lineWidth: 1, 
		
		base: 0,
		depth: 1,
		bevelEnabled:false,

		dashed: false,

		// label 
		text: 'Text',
		fontUrl: undefined,
		billboard: true,
		zoomScale: 1,
		size: 10, 
		align: 'center',
		anchorX: 'center',
		anchorY: 'middle',
		maxWidth: 10,
		haloWidth: 0,
		haloColor: 'white',

		padding: 0,
		
		borderWidth: 0,
		borderRadius: 0,
		borderColor: 'white',
		strokeWidth: 0,
		strokeColor: 'black',
		blur:0,
		fontSize:20,

		haloWidth:0,
		radius: 10,
		sides: 4,

		segments: 12

	},

	mapDefaults: {

		renderer: undefined,
		container: undefined,
		defaultLights: true,
		antialias: true,

		center: undefined,
		pitch: undefined,
		bearing: undefined,
		zoom: undefined,
		hash: false,

		lazyRender: true,
		anchor:[0,0],

		streamTiles: false,
		style: undefined,

		background: 'white',

		onLoop: undefined,
		onRender: undefined,

		onRenderer: undefined,
		onCamera: undefined,

		interactivity: {
			leftDrag: 'dragPan',
			rightDrag: 'dragRotate',
			wheel: 'scrollZoom'
		}
	}
}

export default constant