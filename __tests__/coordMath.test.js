/**
 * @jest-environment jsdom
 */

import {LngLat, Mercator, Point, NDC} from '../src/coordMath.js'
import constant from '../src/core/constants.js'

import {Vector3} from 'three'
import {defaultMap, map} from './fixtures/Map.js'

describe('LngLat', () => {

	test('Instantiate', () => {

		// accept both array and list of numbers
		expect(new LngLat(0, 10) instanceof LngLat).toBe(true);
		expect(new LngLat([0, 0]) instanceof LngLat).toBe(true);

		// empty instantiator yields default origin
		expect(new LngLat())
			.toEqual({lng:0, lat:0, alt:0});

		expect(new LngLat([0, 20]).lat)
			.toEqual( 20, 'object from array returns correct latitude');
		expect(new LngLat(2, 15))
			.toEqual( {lng:2, lat:15, alt:0}, 'object from values returns correct latitude');

	})

	test('errors as expected', () => {

		expect(() => new LngLat('wrongtype')).toThrow();
		expect(() => new LngLat(['wrongtype'])).toThrow();
		expect(() => new LngLat({x:'wrongtype'})).toThrow();

	})

	test('LngLat methods', () => {

		const ll = new LngLat([12, 34]);

		expect(ll.toArray()) 
			.toEqual([12, 34])

		expect(ll.toVector3()) 
			.toEqual(new Vector3(12, 34, 0))

		expect(ll._toWorldPosition(5.5)) 
			.toEqual({
				x:-120905846.57742846, 
				y:-364645395.6605124, 
				z:-0
			})

		expect(new LngLat(54, 32.1).toMercator()) 
			.toEqual({
				x:12022500, 
				y:7552886, 
				z:0
			})

		expect(
			new LngLat([0, 47.5])
				.mercatorScale()
		) 
			.toEqual(1.4801872329222612)

		expect(

			new LngLat(10, 7.5)
				.setMap(map)
				.toPoint()
				.toArray()
		) 
			.toEqual([154.12916657106973, 100.6962147510529])

	})

})

describe('Mercator()', () => {

	expect(new Mercator(0, 10) instanceof Mercator).toBe(true);
	expect(new Mercator([0, 0]) instanceof Mercator).toBe(true);


	test('errors as expected', () => {

		expect(() => new Mercator('wrongtype')).toThrow();
		expect(() => new Mercator(['wrongtype'])).toThrow();
		expect(() => new Mercator({x:'wrongtype'})).toThrow();

	})

	test('Mercator methods', () => {

		// toLngLat()
		expect(new Mercator([56,78]).toLngLat()) 
			.toEqual({
				lng:0.000251528384279476, 
				lat:0.00035034310668444104, 
				alt:0
			})

		// toLngLat() clamped
		expect(new Mercator([9999999999,-999999999]).toLngLat(true))
			.toEqual({
				lng: constant.mercatorRange.lng, 
				lat: -constant.mercatorRange.lat, 
				alt:0
			})

		// _asWorldPositionToLngLat()
		expect(new Mercator([56,78])._asWorldPositionToLngLat(2.2))
			.toEqual({
				lng:-0.00005474204415465919, 
				lat:-0.00007624784721227892, 
				alt:0
			})

		// toPoint()
		expect(new Mercator().setMap(defaultMap).toPoint().toArray())
			.toEqual([150, 100])
	})

})

describe('Point()', () => {

	test('Instantiate', () => {
		expect(new Point(0, 10) instanceof Point)
			.toBe(true);

		expect(new Point().fromMouseEvent({offsetX:20, offsetY:30}))
			.toEqual({x:20, y:30})
	})


	test('methods', () => {

		const mapPoint = new Point(150,100).setMap(map);

		// toNDC
		expect(mapPoint.toNDC().toArray())
			.toEqual([0,0])

		// toLngLat
		expect(mapPoint.toLngLat())
			.toEqual(
				new LngLat(
					-0.0005521047467785334,
					0.0009758942246407335,
					0
				)
			)

		// toMercator
		expect(mapPoint.toMercator().toArray())
			.toEqual([
				-122.91998737305403,
    			217.27200585603714,
    			0
    		])
	})

})


