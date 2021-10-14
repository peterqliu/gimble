import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import {TextureLoader} from 'three'

import BasicObject from '../mesh/BasicObject'

export const loadOBJ = (o, cb) => {

	if (o.mtl) mtlLoader.load(o.mtl, mtl => {
		objLoader.setMaterials(mtl)	
	});

	if (o.texture) textureLoader.load(o.texture, texture=>{
		loadGeometry(o, obj => {
			obj.traverse( child => {
				if ( child.isMesh ) child.material.map = texture;
			} );

		}, cb)

	})

	else loadGeometry(o, undefined, cb)

}

const normalizeModel = (obj, normalize) => {

	return new BasicObject(obj)
		.transformGeometry(normalize)	
}

const loadGeometry = (o, onLoad, userCb) => {
	objLoader.load(o.obj || o, obj => {
		const output = onLoad?.(obj) || obj
		userCb(normalizeModel(output, o.normalize))
	})	

}
const textureLoader = new TextureLoader();
const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();