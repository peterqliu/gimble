import polylineMiterUtil from 'polyline-miter-util';
import polylineNormals from 'polyline-normals'

import add from 'gl-vec2/add.js'
import set from 'gl-vec2/set.js'
import normalize from 'gl-vec2/normalize.js'
import subtract from 'gl-vec2/subtract.js'
import dot from 'gl-vec2/dot.js'

export default {

	polylineNormals: polylineNormals,
	//adapted from https://github.com/mattdesl/polyline-miter-util
	polylineMiterUtil: {
		computeMiter: (tangent, miter, lineA, lineB, halfThick) =>{
		    //get tangent line
		    add(tangent, lineA, lineB)
		    normalize(tangent, tangent)

		    //get miter as a unit vector
		    set(miter, -tangent[1], tangent[0])
		    set(tmp, -lineA[1], lineA[0])

		    //get the necessary length of our miter
		    return halfThick / dot(miter, tmp)
		},

		normal: (out, dir) =>{
			//get perpendicular
			set(out, -dir[1], dir[0])
			return out
		},

		direction: (out, a, b) => {
		    //get unit dir of two lines
		    subtract(out, a, b)
		    normalize(out, out)
		    return out
		}
	},
	add_1: add,
	set_1: set,
	normalize_1: normalize,
	subtract_1: subtract,
	dot_1: dot,

	tmp: [0,0],
	lineA: [0,0],
	lineB: [0,0],
	tangent: [0,0],
	miter: [0,0],

	addNext: (out, normal, length) =>{
	    out.push([[normal[0], normal[1]], length])
	}
}