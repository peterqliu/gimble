import {Mesh} from 'three';
import methods from './ObjectMethods.js'

// This class implements animations entirely on CPU: calculating end-state matrices from p/s/r,
// linearly interpolating the matrix from start to end on each frame

export default class BasicMesh extends Mesh {

	constructor(geometry, material) {

		super(geometry, material);

		this.updateMatrix();
		this.matrixAutoUpdate = false;
	}

}

Object.assign(BasicMesh.prototype, methods)
