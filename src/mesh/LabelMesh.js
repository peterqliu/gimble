import {Vector3, Matrix4, Color, Group, Mesh} from 'three'
import {Text} from 'troika-three-text'

import state from '../core/state.js'
import methods from './ObjectMethods.js'

export default class LabelMesh extends Group {

	constructor(geom) {

		super();
		this.matrixAutoUpdate = false;
		this.style = geom.style;

		geom.geometry
			.forEach(g=>{
				g.s.color = geom.style.color; // add color back in in case it was a nonfunction value that got culled 
				this.add(LabelMesh.makeText(g))
			})
	}


	set size(s) {

		this.applyStyle('size', s, v=>v/5)
			.rerenderOnComplete()
	}

	set opacity(o) {

		this.style.opacity = o;
		this.traverse(child => {

			if (!child.material) return // don't traverse the parent
			const computed = methods.computeValue(o, child.properties)
			child.material[1].opacity = computed
		})

		this.renderLoop?.rerender()
	}

	set color(c) {
		this.applyStyle('color', c, c=> new Color(c))
	}

	set haloColor(c) {
		this.applyStyle('haloColor', c, c => new Color(c))
	}

	set haloWidth(w) {
		this.applyStyle('haloWidth', w, w => this.size * w)
	}

	set align(a) {
		this.applyStyle('align', a)		
			.rerenderOnComplete()
	}

	set anchorX(a) {
		this.applyStyle('anchorX', a)		
	}

	set anchorY(a) {
		this.applyStyle('anchorY', a)		
	}

	get billboard() {return this.style.billboard}
	get zoomScaled() {return this.style.zoomScaled}
	get opacity() {return this.style.opacity}
	get size() {return this.style.size}
	get haloColor() {return this.style.haloColor}
	get haloWidth() {return this.style.haloWidth}

	get color() {return this.style.color}

	// some updates are somehow slow enough
	// to cause race condition with render loop.
	// As workaround, flag rerender on each Text's onSync, and then
	// delete the listener so it doesn't get into an infinite
	// loop with renderer.render
	rerenderOnComplete() {

		this.traverse(c => c.sync = () => {
			this.renderLoop?.rerender();
			delete c.sync
		})
	}

	// updates internal style store,
	// computes data-driven value for each child (if necessary),
	// assign computed value to proper key in child (with finishing fn if necessary)

	applyStyle(key, value, fn) {

		const k = styleMappings[key] || key;
		this.style[k] = value;

		this.children.forEach(child => {
				const computed = methods.computeValue(value, child.properties)

				// if function present, apply that to computed value
				// if not, use computed value directly
				child[k] = fn ? fn(computed) : computed;
			})

		this.renderLoop?.rerender()

		return this
	}


	static makeText(geom) {

		const styleObj = geom.s;
		const text = new Text();

		// apply billboarding and zoomscaling to vertex shader
		text.material.onBeforeCompile = s => s.vertexShader = transformVertexShader(s.vertexShader)
		text.material.opacity = styleObj.opacity
		
		if (styleObj.renderOrder !== 0) text.material.depthTest = false;
		
		Object.assign(
			text.material.uniforms, 
			{
				billboardMatrix:styleObj.billboard ? state.uniforms.cameraRotationMatrix : {value: new Matrix4()},
				zoom: styleObj.zoomScaled ? {value: 0} : state.uniforms.zoom	
			}
		)

		Object.assign(text, {

			font: styleObj.fontUrl, 
			text: styleObj.text,
			fontSize: styleObj.size/1000000,
			color: new Color(styleObj.color),
			textAlign: styleObj.align,
			maxWidth:  0.01 * styleObj.maxWidth * styleObj.size,

			outlineWidth: styleObj.haloWidth/5000000,
			outlineColor: styleObj.haloColor,
			anchorX: styleObj.anchorX,	
			anchorY: styleObj.anchorY,

			matrixAutoUpdate: false,
			renderOrder: styleObj.renderOrder,
			properties: geom.p

		})

		text.position
			.copy(new Vector3()
				.add(geom.g)
				.add(styleObj?.translation ?? new Vector3())
			)

		text.updateMatrix();
		
		// flag rerender whenever the text finishes updating	
		text.sync( () => {
			text.parent.renderLoop?.rerender()
		});

		return text
	}


	applyTileTranslation(t) {

		this.position.add(t);
		this.updateMatrix();

		return this;
	}
}

// map troika-three-text property words
// to more generic words
const styleMappings = {

	size: 'fontSize',
	haloColor: 'outlineColor',
	haloWidth: 'outlineWidth',
	align: 'textAlign'
}

Object.assign(LabelMesh.prototype, methods)

const transformVertexShader = vs => {

	// three injection points for adding definitions, billboarding, and zoomScaling
	const definitionsFlag = `uniform vec3 diffuse;`
	const billboardFlag = `mvPosition = modelViewMatrix * `;
	const zoomScaleFlag = `vec4 mvPosition = vec4( transformed`;

	const edited = vs
		.replace(
			`uniform vec3 diffuse;`,
			`${definitionsFlag}
			uniform mat4 billboardMatrix;
			uniform float zoom;`
		)
		.replace(
			billboardFlag, 
			`${billboardFlag}billboardMatrix * `, 

		)
		.replace(
			zoomScaleFlag,
			`float zoomScale = pow(2.0, 22.0 - zoom);
			${zoomScaleFlag} * zoomScale`
		)

	return edited
}