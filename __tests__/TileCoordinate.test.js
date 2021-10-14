import TileCoordinate from '../src/tile/TileCoordinate.js'
// import V3FeatureCollection from '../geometry/V3FeatureCollection.js'


describe('TileCoordinate', () => {

	test('Instantiate', () => {

		const tC = new TileCoordinate(6,2,3);

		expect(tC instanceof TileCoordinate)
			.toEqual(true)
		expect(tC)
			.toEqual({x:6,y:2,z:3})
	})


	test('rebuild()', () => {

		expect(new TileCoordinate().rebuild({x:7, y:2, z:19}))
			.toEqual({x:7, y:2, z:19})
	})

	test('tileCoordsToQuads()', () => {

		expect(new TileCoordinate(4,2,11).tileCoordsToQuads())
			.toEqual(0)
	})

	test('toCacheKey()', () => {

		expect(new TileCoordinate(4,2,17).toCacheKey())
			.toBe('4/2/17')
	})

	test('getMercatorOffset()', () => {

		expect(new TileCoordinate(1,99,21).getMercatorOffset())
			.toEqual({
				x: -40074942.672252655, 
				y: 40071197.25942612, 
				z: 0
			})

		expect(new TileCoordinate(199,19,13).getMercatorOffset())
			.toEqual({
				x: -38123104.85839844, 
				y: 39884213.25683594, 
				z: 0
			})

		expect(new TileCoordinate(3,2,4).getMercatorOffset())
			.toEqual({
				x: -22542187.5, 
				y: 27551562.5, 
				z: 0
			})

	})
})