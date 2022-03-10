import constant from '../core/constants.js'
import state from '../core/state.js'

import {
	PerspectiveCamera, 
	Scene, 
	WebGLRenderer, 
	Group, 
	DirectionalLight, 
	AmbientLight,
	Matrix4 
} from 'three'

import CoreLoop from './CoreLoop.js'



export var container;

export const setup = {

	init: o => {

		const output = {
			coreLoop: new CoreLoop(),
			renderer: o.renderer || new WebGLRenderer({
				powerPreference: 'high-performance',
				logarithmicDepthBuffer: true, 
				antialias: true
			}),
			scene: new Scene(),
			world: new Group(),
			camera: new PerspectiveCamera( constant.fov, 1, 0.001, constant.projection.extent*100 )
		}

		output.coreLoop.setup = output;


		container = o.container instanceof HTMLElement ? o.container : document.getElementById(o.container);
		container.appendChild( output.renderer.domElement );

		setup.setViewportSize
			.call(output, container.scrollWidth, container.scrollHeight)

		output.renderer
			.setClearColor(o.background || '#fff');
		output.renderer
			.setPixelRatio(window.devicePixelRatio || 1);
		output.renderer.shadowMap.autoUpdate = false;
		// renderer.localClippingEnabled = true; // for tiled maps only

		output.world.matrixAutoUpdate = false;
		output.camera.matrixAutoUpdate = false;

		output.scene.add(output.world);

		if (o.defaultLights !== false) {

			const light = new DirectionalLight( 0xffffff, 0.2 );
			light.position.z = constant.projection.extent;
			const ambient = new AmbientLight( 0xffffff, 0.8 );

			output.world.add(ambient);
			output.world.add( light );	

			light.matrixAutoUpdate = false;
			ambient.matrixAutoUpdate = false;

			light.updateMatrix();
			ambient.updateMatrix();
		}

		return output

	},

	setViewportSize: function(x,y) {
		
		this.camera.aspect = x / y;
		this.camera.fov = calculateFOV(y);
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(x,y);
		state.uniforms.viewportSize.value.set(x,y)
	
	}
}

const tanFOV = Math.tan( ( ( Math.PI / 180 ) * constant.fov / 2 ) );
const calculateFOV = height => ( 360 / Math.PI ) * Math.atan( tanFOV * ( height / 1000 ) );

export function addToWorld(item) {

	var toAdd = item;

	if (toAdd.length) {
		toAdd.forEach(mesh=>mesh.renderLoop = this.coreLoop)
		this.world.add(...toAdd)
	}

	else if (typeof toAdd === 'object') {
		toAdd.renderLoop = this.coreLoop;
		this.world.add(toAdd)
	};

	this.coreLoop.rerender();

	return this
}
