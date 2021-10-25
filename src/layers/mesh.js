import state from '../core/state.js'
import geometry from './geometry.js'
import BufferGeometryUtils from './BufferGeometryUtils.js';

import V3Feature from '../geometry/V3Feature.js'
import V3FeatureCollection from '../geometry/V3FeatureCollection.js'

import {deepParse} from '../workerPool.js'

import StyleObject from '../ui/StyleObject.js'

import BasicMesh from '../mesh/BasicMesh.js';

import CircleMesh from '../mesh/CircleMesh.js';
import LabelMesh from '../mesh/LabelMesh.js';
import LineMaterial from '../material/LineMaterial.js';

import {BufferGeometry, Vector3, Color, MeshLambertMaterial, Group } from 'three'

import constant from '../core/constants.js'
import GeometryLike from '../geometry/GeometryLike.js'


const makeMaterial = (layerType, style) => {

	// lines have special line material. otherwise use generic lambertmaterial
	var material = layerType === 'line' ? new LineMaterial() : mlb.clone();

	// set material.vertexColors to the opposite of literalColor
	const literalColor = typeof style.color !== 'function';
	const literalOpacity = typeof style.opacity !== 'function';

	material.vertexColors = !literalColor;
	material.vertexAlphas = !literalOpacity;

	// if literal color, set color as material uniform
	if (literalColor) {

		const color = new Color(style.color);

		if (layerType === 'line') material.uniforms.lineColor.value = color;
		else material.color = color

	}	

	// if opacity is literal and <1, 
	if (literalOpacity && style.opacity<1) {
		material.opacity = style.opacity
	}

	material.transparent = true;

	return material
}

const mlb = new MeshLambertMaterial();


// generic class for geometry primitives
export class Primitive extends BasicMesh{

	constructor() {
		super()
	}

	fromData(type, g, styleObj) {

		const style = new StyleObject(styleObj)
			.applyDefaults(type);
		var geom = new GeometryLike(g)
			.prepareForType(type, style)

		const d = {
			layerType: type,
			geometry: new GeometryLike(g)
				.prepareForType(type, style),
			source: 'geojson',
			style: style			
		}

		if (type === 'label' ) {


			geom
				.forEach(v3f => {
					if (typeof style.color !== 'function') v3f.s.color = style.color
					// v3f.s = new StyleObject(v3f.s).applyDefaults('label');
				})

			return new LabelMesh(d)
		}

		else if (type === 'circle') return new CircleMesh(geom, style)



		// otherwise, build geometries of each feature and merge them into one
		geom = geom.length === 1 ? geometry[type](...geom) : 
		BufferGeometryUtils.mergeBufferGeometries(
			geom.map((f,i) => geometry[type](f, i))
		)

		const m = new BasicMesh(geom, makeMaterial(type, style))
			.create(d)
		m.style = style;
		return m

	}

	fromTile(d) {

		const layer = d.layerType;

		const style = d.style = new StyleObject()
			.fromStylesheetLayer(d.id)
			.applyDefaults(d.layerType);

		if (layer === 'label' || layer === 'circle') {

			if (!d.geometry.g.length) return null

			// if tiled circle

			if (layer === 'circle') {

				const circle = new CircleMesh(d.geometry.g, style)
					.setZoomLevel(d.zxy.z);

				circle.position
					.copy(d.meshOptions.anchor)
				
				return circle
			}

			// if tiled label
			else if (layer === 'label') {

				const labels = d.geometry.g.map(f => {

					// hardcoded colors get removed from style object, so retrieve them from stylesheet
					f.s.color = f.s.color ? new Color(f.s.color) : new Color(style.color)
					
					return new LabelMesh(f, f.s)
						.setZoomLevel(d.zxy.z)
						.applyTileTranslation(d.meshOptions.anchor)

				})

				return labels
			}
		}

		// if not label or circle
		else {		

			const m = new BasicMesh(d.geometry, makeMaterial(layer, style))
				.create(d)
			return m
		}
	}

	makeMaterial() {

	}
}


// unlike others, circles are actually InstancedUniformsMesh, hence the return statement.
// copying from Primitive only for data transformation methods
export class Circle extends Primitive {

	constructor(g, styleObj) {

		super();
		return this.fromData('circle', g, styleObj);

	}
}

export class Sphere extends Primitive {

	constructor(g, styleObj) {

		super();
		this.copy(this.fromData('sphere', g, styleObj));

	}
}

export class Label extends Primitive {

	constructor(g, styleObj) {

		super();
		return this.fromData('label', g, styleObj);

	}
}

export class Line extends Primitive {

	constructor(g, styleObj) {

		super();
		const line = this.fromData('line', g, styleObj);
		this.copy(line);

		this.style = line.style;

	}
}

export class Fill extends Primitive {

	constructor(g, styleObj) {

		super();
		const fill = this.fromData('fill', g, styleObj);
		this.copy(fill);
		this.style = fill.style;
	}
}

export class Extrusion extends Primitive {

	constructor(g, styleObj) {

		super();
		const extrusion = this.fromData('extrusion', g, styleObj);
		this.copy(extrusion);
		this.style = extrusion.style;
	}
}