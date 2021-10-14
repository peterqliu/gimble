/**
 * @jest-environment jsdom
 */

import 'isomorphic-fetch'
import CoreLoop from '../src/ui/CoreLoop.js'
import {defaultMap} from './fixtures/Map.js'

describe('Instantiate', () => {

	expect(new CoreLoop() instanceof CoreLoop)
		.toBe(true)

})

describe('updates', () => {

	test('rerender', () => {
		expect(new CoreLoop().rerender().needsRerender)
			.toBe(true)
	})

	test('updateCamera', () => {
		const cL = new CoreLoop().updateCamera();
		expect(cL.needsRerender === cL.cameraNeedsUpdate === true)
			.toBe(true)
	})

	test('updateWorld', () => {
		const cL = new CoreLoop().updateWorld();
		expect(cL.needsRerender === cL.worldNeedsUpdate === true)
			.toBe(true)
	})

	test('updateTiles', () => {
		const cL = new CoreLoop().updateTiles();
		expect(cL.needsRerender === cL.tilesNeedUpdate === false)
			.toBe(true)
	})

})

describe('animation', () => {

	// TODO
	// iterateanimationqueue
	// isanimating

	test('animateUntilAtLeast', () => {
		const cL = new CoreLoop().animateUntilAtLeast(5678);
		expect(cL.animatingUntil).toBe(5678)
	})

	test('addToAnimationQueue', () => {
		const dummyItem = {test:true}
		const cL = new CoreLoop().addToAnimationQueue(dummyItem);
		expect(cL.animationQueue.has(dummyItem))
			.toBe(true)
	})

})

// describe('methods', () => {

// 	//TODO preemptbeforelongtask
// 	// loop

// 	test('loop', () => {

// 		const cL = defaultMap.loop;
// 		console.log(cL.setup.renderer.render)
// 		cL.rerender()
// 		cL.loop();

// 		expect(cL.needsRerender).toBe(false)

// 	})

// 	test('preemptBeforeLongTask', () => {



// 	})	


// })


