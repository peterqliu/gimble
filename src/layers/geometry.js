import getNormals from 'polyline-normals'

import tubeUtilities from './tube.js'
import {makeTube} from './tube.js'

import {
	Color,
	Shape,
	Float32BufferAttribute,
	BufferGeometry,
	BufferAttribute,
	ExtrudeGeometry,
	PlaneGeometry,
	Vector3,
	SphereGeometry
} from 'three';

export function applyColorAlpha(style) {

	if (!style.color) return this
	const rgb = new Color(style.color);
	const length = style.opacity < 1 ? 4 : 3;

	const colorArr = new Array(this.attributes.position.count*length);

	for (var i = 0; i<colorArr.length; i+=length ) {
		colorArr[i] = rgb.r;
		colorArr[i+1] = rgb.g;
		colorArr[i+2] = rgb.b;
		if (length === 4) colorArr[i+3] = style.opacity;
	}

	const attr = new THREE.Float32BufferAttribute(colorArr, length)
	attr.normalized = true;		

	this.setAttribute('color', attr)
	return this	
}

export function applyFeatureIndex(index) {

	const arrayLength = this.attributes.position.count/3;
	const featureIndexArray = new Float32Array(arrayLength).fill(index)
	
	this.setAttribute(
		'featureIndex', 
		new THREE.BufferAttribute(
			featureIndexArray, 
			1
		)
	)

	return this

}

// thin wrapper around BufferGeometry to apply color and feature index (for picking)
// class V3Geometry {

// 	constructor(ft, bufferGeometry) {

// 		this.ft = ft;
// 		this.geometry = bufferGeometry;
// 		this._applyColorAlpha()
	
// 	}

// 	_applyColorAlpha() {

// 		if (!this.ft.s.color) return this
// 		const rgb = this.ft.s.color;
// 		const length = this.ft.s.opacity < 1 ? 4 : 3;

// 		const colorArr = new Array(this.geometry.attributes.position.count*length);

// 		for (var i = 0; i<colorArr.length; i+=length ) {
// 			colorArr[i] = rgb.r;
// 			colorArr[i+1] = rgb.g;
// 			colorArr[i+2] = rgb.b;
// 			if (length === 4) colorArr[i+3] = this.ft.s.opacity;
// 		}

// 		const attr = new THREE.Float32BufferAttribute(colorArr, length)
// 		attr.normalized = true;		

// 		this.geometry.setAttribute('color', attr)
// 		return this	

// 	}

// 	applyFeatureIndex(index) {

// 		const arrayLength = this.geometry.attributes.position.count/3;
// 		const featureIndexArray = new Float32Array(arrayLength).fill(index)
		
// 		this.geometry.setAttribute(
// 			'featureIndex', 
// 			new THREE.BufferAttribute(
// 				featureIndexArray, 
// 				1
// 			)
// 		)

// 		return this
// 	}

// 	getGeometry() {
// 		return this.geometry;
// 	}

// }
const planeGeometry = new PlaneGeometry();

const circleGeometry = () => planeGeometry;

const extrusionGeometry = (ft, index) => {
	
	ft.s.depth = ft.s.height;
	const g = new THREE.ExtrudeGeometry(ft._makeShape(), ft.s);
	// g.translate(0,0, ft.s.height);
	applyColorAlpha.call(g, ft.s)


	return g

}

const fillGeometry = (ft, index) => {
	
	const geometry = applyColorAlpha.call(new THREE.ShapeGeometry(ft._makeShape()), ft.s)


	return geometry

}

const tubeGeometry = (ft, index) => {

	const geom = applyColorAlpha.call(makeTube, ft.s)

	new V3Geometry(ft, makeTube(ft))
		.applyFeatureIndex(index)
		.getGeometry();

	return geom

}

const lineGeometry = (ft) => {

	// adapting https://github.com/mattdesl/three-line-2d for web worker
	const lineMesh = (path, o) => {
		
		var VERTS_PER_POINT = 2;

		const geom = new THREE.BufferGeometry();
		var count = path.length * VERTS_PER_POINT;

		var indexCount = Math.max(0, (path.length - 1) * 6);
		const attrIndex = new THREE.BufferAttribute(new Uint16Array(indexCount), 1);

		// create position attribute array

		const attrPosition = new THREE.BufferAttribute(new Float32Array(count * 3), 3);

		var index = 0;
		var c = 0;
		var dIndex = 0;
		var indexArray = attrIndex.array;

		path.forEach( (point, pointIndex, list) =>{
			var i = index;
			indexArray[c++] = i + 0;
			indexArray[c++] = i + 1;
			indexArray[c++] = i + 2;
			indexArray[c++] = i + 2;
			indexArray[c++] = i + 1;
			indexArray[c++] = i + 3;

			attrPosition.setXYZ(index++, point[0], point[1], 0);
			attrPosition.setXYZ(index++, point[0], point[1], 0);

		});		


		// create normals attribute array
		
		const attrNormal = new THREE.BufferAttribute(new Float32Array(count * 2), 2);
		const attrMiter = new THREE.BufferAttribute(new Float32Array(count), 1);

		// create normals but cap miters from getting too thicc
	    var normals = getNormals(path, false)
	    	.map(i=>[i[0], Math.min(i[1], 10)]);

		var nIndex = 0;
		var mIndex = 0;

		normals.forEach(n => {
			var norm = n[0];
			var miter = n[1];
			attrNormal.setXY(nIndex++, norm[0], norm[1]);
			attrNormal.setXY(nIndex++, norm[0], norm[1]);

			attrMiter.setX(mIndex++, -miter);
			attrMiter.setX(mIndex++, miter);
		});

		geom
			.setAttribute('position', attrPosition)
			.setAttribute('lineNormal', attrNormal)
			.setAttribute('lineMiter', attrMiter)
			.setIndex(attrIndex);

		return geom

	}

	var positions = [];

	ft.g.forEach(v3=> {
		positions.push([v3.x, v3.y])
	})

	const geometry = applyColorAlpha.call(lineMesh(positions), ft.s)

	geometry
		.setAttribute(
			'lineWidth',
			new THREE.BufferAttribute(new Float32Array(positions.length*2).fill(ft.s.width), 1)
		)

	return geometry		


};

const sphereGeometry = (ft, index) => {

	const geometry = applyFeatureIndex.call(
		new THREE.SphereGeometry(ft.s.radius, ft.s.segments, ft.s.segments),
		index
	)

	geometry.translate(ft.g.x, ft.g.y, ft.g.z)

	return geometry

}

export default {

	line: lineGeometry,
	tube: tubeGeometry,
	extrusion: extrusionGeometry,
	fill: fillGeometry,
	circle: circleGeometry,
	sphere: sphereGeometry,

	applyFeatureIndex: applyFeatureIndex,
	applyColorAlpha: applyColorAlpha
}