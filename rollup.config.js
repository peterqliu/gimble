import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import glslify from 'rollup-plugin-glslify';
import includePaths from 'rollup-plugin-includepaths';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';

export default [
	// browser-friendly UMD build
	{
		input: 'src/main.js',
		output: {
			name: 'gimble',
			file: pkg.browser,
			format:'umd',
			// globals:['Pbf']
			// plugins: [terser()]
		},
		moduleContext:{
			// 'src/ui/mapControl.js': 'this',
			// 'src/ui/threeSetup.js': 'this',
			// 'src/mesh/ObjectMethods.js': 'this'
		},
		plugins: [
			commonjs(), 
			resolve({preferBuiltins: true}),
			json(),
			glslify(),
		    includePaths({ paths: ["./"] }),
		    // terser()
		], 
	}
];
