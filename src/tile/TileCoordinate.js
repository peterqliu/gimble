import {Vector3} from 'three'
import constant from '../core/constants.js';

export default class TileCoordinate extends Vector3 {

	constructor(x,y,z) {
		super(x,y,z)
	}

	rebuild(vector3) {
		Object.assign(this, vector3)
		return this
	}

	// for domain sharding and worker load balancing
	tileCoordsToQuads() { return 2*(this.x%2) + this.y%2}

	toCacheKey() {
		return `${this.x}/${this.y}/${this.z}`
	}

	getMercatorOffset() {

		const wR = constant.projection.extent;
	    const tileWidth = wR * Math.pow(0.5, this.z);
		const tilePosition = new Vector3(
			-wR/2 + (this.x + 0.5) * tileWidth,
			wR/2 - (this.y + 0.5) * tileWidth,
			0
		)
	          
	    return tilePosition		

	}
}