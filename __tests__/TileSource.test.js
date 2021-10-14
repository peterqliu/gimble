import TileSource from '../src/tile/TileSource.js'




describe('Instantiate TileSource', () => {

	test('Errors as expected', () => {

		expect(() => new TileSource())
			.toThrow()
		expect(() => new TileSource({}))
			.toThrow()
		expect(() => new TileSource({tiles:true}))
			.toThrow()

	})

	test('Accepts string and function tile parameter', () => {

		expect(typeof new TileSource({tiles: 'string'}))
			.toBe('object')

		expect(typeof new TileSource({tiles: ()=>'function'}))
			.toBe('object')
	})
})

describe('.loadArea', () => {

	const tS = new TileSource({tiles: 'string'});
	const polygon = {
		"type": "Polygon",
		"coordinates": [[[0,0], [1,1], [2,2], [0,0]]]
	}

	test('Errors as expected', () => {

		expect(() => tS.loadArea())
			.toThrow()
		expect(() => tS.loadArea({}))
			.toThrow()
		expect(() => tS.loadArea({geojson:'wrongtype'}))
			.toThrow()

	})

	test('Second argument optional', () => {

		expect(tS.loadArea({geojson:polygon}))
			.toBe(undefined);
	})
})