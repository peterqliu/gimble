/**
 * @jest-environment jsdom
 */

import {jest} from '@jest/globals'
import gimbleMap from '../src/ui/map.js'
import {defaultMap, map} from './fixtures/Map.js'


describe('Map()', () => {

	test('instantiate Map', () => {

		expect(map instanceof gimbleMap)
			.toEqual(true)

		// projectionMatrix reflects aspect ratio of canvas
		expect(defaultMap.camera.projectionMatrix.elements)
			.toEqual([1.6094757082487299,0,0,0,0,2.414213562373095,0,0,0,0,-1.0000000000020002,-1,0,0,-0.002000000000002,0])

		// updateCameraMatrix works
		expect(defaultMap.camera.matrixWorld.elements)
			.toEqual([1,0,0,0,0,1,0,0,0,0,1,0,0,0,160300000,1])

		expect(defaultMap.camera.matrixWorldInverse.elements)
			.toEqual([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-160300000,1])

		expect(map.camera.projectionMatrix.elements)
			.toEqual([1.6094757082487299,0,0,0,0,2.414213562373095,0,0,0,0,-1.0000000000020002,-1,0,0,-0.002000000000002,0])

		expect(map.camera.matrixWorld.elements)
			.toEqual([0.8910065241883679,0.45399049973954675,0,0,-0.43640367771952165,0.8564904425334173,0.27563735581699916,0,0.1251367409142467,-0.24559468234297682,0.9612616959383189,0,20059419.568553746,-39368827.57957918,154090249.85891253,1])
	
	})

	test('errors as expected', () => {

		expect(() => new gimbleMap({})).toThrow();
		expect(() => new gimbleMap({container:true})).toThrow();
		expect(() => new gimbleMap({hash:'notaboolean'})).toThrow();

	})

	// TODO setHashView

	test('getters work', () => {

		expect(map.pitch).toEqual(16)
		expect(map.bearing).toEqual(27)
		expect(map.zoom).toEqual(0.2)
		expect(map.center).toEqual({"alt": 0, "lat": 34, "lng": 12})

		expect(typeof map.loop).toEqual('object')
		expect(typeof map.scene).toEqual('object')
		expect(typeof map.renderer).toEqual('object')
		expect(typeof map.world).toEqual('object')
		expect(typeof map.camera).toEqual('object')


	})

	test('setters work', () => {

		map.bearing = -11;
		map.center = [-33,45];
		map.zoom = 12;

		expect(map.bearing).toEqual(-11)
		expect(map.zoom).toEqual(12)
		expect(map.center).toEqual({"alt": 0, "lat": 45, "lng": -33})
		expect(map.pitch).toEqual(16)

	})	
})

