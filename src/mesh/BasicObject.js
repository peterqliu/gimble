import {Object3D, Matrix4, Vector3, Mesh, Group} from 'three';
import methods from './ObjectMethods.js'
import {Mercator} from '../coordMath.js'

export default class BasicObject extends Object3D {

	constructor(o3d) {

		super();

		if (o3d instanceof Mesh) this.children.push(o3d)
		else if (o3d instanceof Group) this.copy(o3d, true);

		this.up = new Vector3(0, 0, 1);

		this.updateMatrix();
		this.matrixAutoUpdate = false;

		this.rotation._order = 'ZXY';

	}

	// apply changes to the underlying geometry.
	// useful for getting imported models to the right size/orientation/centering
	transformGeometry(o){

		if (o) {

			const p = this.coalesceTransform(o, 'omitDefaults');

			this.traverse(item => 

				item.geometry?.applyMatrix4(
					new Matrix4()
						.compose(
							p.position || this.position, 
							p.quaternion || this.quaternion, 
							p.scale || this.scale
						)
					)

			)

		}

		return this

	}

}

Object.assign(BasicObject.prototype, methods)
