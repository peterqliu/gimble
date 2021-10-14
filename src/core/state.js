import * as THREE from 'three'

const state = {

	_animation: {

		animating: false,
		until: 0,
		startTime: 0

	},

	world: {

		translationMatrix: new THREE.Matrix4(),
		scaleMatrix: new THREE.Matrix4()
	
	},

	needsRerender: true,

	camera: {
		rotationMatrix: new THREE.Matrix4(),
		matrixNeedsUpdate: false,
		worldPanDelta: null,
		deferredLayerUpdate: false
	},

	interaction: {
		lastInt: null,
		lastMove: 0,
		lastDispatch: 1,
		isMoving: false,
		noChange: true,
		lastIntegerZoom:0
	},

	quotient: {
		zoomWheel: 1000,
		pitchDrag: 5,
		bearingDrag: 3
	},


	// set uniform value

	setU: (key, value) => {
		state.uniforms[key].value = value;
		return state;
	},

	// retrieves uniform value. Don't use this within shaders to access uniforms,
	// as that will only pass by value and miss future updates

	getU: key => state.uniforms[key].value,

	// pack uniforms into objects so they can be readily
	// passed-by-reference to shaders

	uniforms: {
		
		cameraStartMatrix: {value: new THREE.Matrix4()},
		worldStartMatrix: {value: new THREE.Matrix4()},
		worldMatrix: {value: new THREE.Matrix4()},
		worldAnimationStartTime: {value: 0},
		worldAnimationDuration: {value: 250},

		center: {value: new THREE.Vector3()},
		zoom: {value: 0},
		pitch: {value: 0},
		bearing: {value: 0},

		now: {value: 0},
		animateUntil: {value: 0},


		viewportSize: {value: new THREE.Vector2()},
		pixelRatio: {value: window.devicePixelRatio},
		cameraRotationMatrix:{value: new THREE.Matrix4()},

	},

	tile: {
		
		// flag to update visible tilecoods
		needUpdate: false,

		// track visible tilecoords
		currentlyVisible:[ ],
		
		// track requests to anticipate from network
		currentlyAnticipating: 0,
		
		// track meshes to anticipate from streamed tiles
		geometriesCurrentlyAnticipating: 0
	
	},

	_debugMesh: new THREE.Mesh(
		new THREE.PlaneGeometry(99999999, 100, 100),
		new THREE.MeshBasicMaterial({wireframe:true, color:'red'})
	),
	
}

export default state