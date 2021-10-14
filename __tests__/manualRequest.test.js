import {manualRequest} from '../src/tile/tileManager.js'

describe('manualRequest', ()=>{

	test('write entry', () => {
		manualRequest.write('key', 'value');
		expect(manualRequest.callbacks)
			.toEqual({key: 'value'})
	})

	test('retrieve entry', () => {
		expect(manualRequest.retrieve('key'))
			.toEqual('value')
	})

	test('erase entry', () => {
		manualRequest.erase('key')
		expect(manualRequest.callbacks)
			.toEqual({})
	})


	test('inbound', () => {

		var count = 0;

		// this mock entry has 11 tile requests,
		// and increments the counter for every tile coming back
		// and when all tiles have returned
		var mockCbEntry = {
			onTile: () => count++,
			onAllTiles: () => count++,
			count: 11,
			tiles: [],
			rebuildFn: undefined
		}

		var mockInbound = {
			lookupKey: 'key'
		}

		manualRequest.write('key', mockCbEntry)

		manualRequest.inbound(mockInbound)

		// first inbound should increment counter to 1
		expect(count).toEqual(1)
		expect(manualRequest.callbacks.key.count).toEqual(10)

		// ten more inbounds should increment counter 10 more,
		// plus 1 for onAllTiles callback
		for (var i = 0; i<10; i++) manualRequest.inbound(mockInbound)			
		

		expect(count).toEqual(12)

		expect(manualRequest.callbacks).toEqual({})

	})
})