
import BasicObject from '../src/mesh/BasicObject.js'
import {Mercator} from '../src/coordMath.js'
import CoreLoop from '../src/ui/CoreLoop.js'
import {Mesh, PlaneGeometry, MeshBasicMaterial, MathUtils} from 'three';


describe('Instantiate BasicObject', () => {

	test(
		'creates an object', 
		() => expect(new BasicObject() instanceof BasicObject)
			.toEqual(true)		
	)

})

describe('setZoomLevel()', () => {

	test(
		'Set to array works', 
		() => expect(new BasicObject().setZoomLevel([3,4,5]).layers.mask)
			.toEqual(112)
	);

	test(
		'Non-number does nothing', 
		() => expect(new BasicObject().setZoomLevel('notanumber').layers.mask)
			.toEqual(1)
	);
})

describe('setRenderOrder()', () => {

	const dummyMesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial());
	const bO = new BasicObject(dummyMesh).setRenderOrder(-2);
	test('depthTest updates', 
		() => expect(bO.children[0].material.depthTest)
			.toEqual(false)
	);
	test('renderOrder updates', 
		() => expect(bO.renderOrder)
			.toEqual(-2)
	);

})

describe('transform operations', () => {

	test('getters', () => {

		expect(new BasicObject().getPosition())
			.toEqual({x:0, y:0, z:0});

		expect(new BasicObject().getLngLat())
			.toEqual({lng:0, lat:0, alt:0});

		expect(new BasicObject().getScale())
			.toEqual({x:1, y:1, z:1});

		expect(new BasicObject().getPitch())
			.toEqual(0);

		expect(new BasicObject().getBearing())
			.toEqual(0);

		expect(new BasicObject().getRoll())
			.toEqual(0);

	})


	test('setters', () => {

		expect(new BasicObject().setPosition({x:999, y:99, z:9}).position)
			.toEqual({x:999, y:99, z:9});

		expect(new BasicObject().setLngLat([20, -13,55]).position)
			.toEqual({x:4452778, y:-2919463, z:56.44672592863654});

		expect(new BasicObject().setScale(5.5).scale)
			.toEqual({x:5.5, y:5.5, z:5.5});

		expect(new BasicObject().setScale({x:5.5, y:5.5, z:5.5}).scale)
			.toEqual({x:5.5, y:5.5, z:5.5});

		expect(new BasicObject().setPitch(45).rotation.x)
			.toEqual(MathUtils.degToRad(45));

		expect(new BasicObject().setRoll(-22).rotation.y)
			.toEqual(MathUtils.degToRad(-22));

		expect(new BasicObject().setTarget(new Mercator(555,666,0)).rotation.z)
			.toEqual(-0.6947382761967031);
	})

	test('setters on the actual matrix', () => {

		expect(new BasicObject()
			.setScale(3.4)
			.setLngLat([-19, -77])
			.setBearing(107)
			.setRoll(97)
			.matrix.elements
		)
		.toEqual([
			0.12114590212833178,
			0.3962503911950784,
			-3.374656915580495,
			0,
			3.251436170274321,
			-0.9940637960573042,
			0,
			0,
			-0.9866541952626414,
			-3.2272004581131752,
			-0.41435576757750125,
			0,
			-4230139,
			-27708170,
			0,
			1
		]);
	})
})

describe('Animations', () => {

	test('coalesceTransform()', () => {
		expect(	new BasicObject()
			.coalesceTransform({
				position: new Mercator({x:222, y:111, z:333}),
				target: new Mercator({x:687, y:-22, z:907}),
				pitch:25, // should not affect result, given target
				scale:5
			})
		)	
			.toEqual({
				"position": {
					"x": 222,
					"y": 111,
					"z": 333,
				},
				"scale": {
					"x": 5,
					"y": 5,
					"z": 5,
				},
				"quaternion": {
					"_x": 0,
					"_y": 0,
					"_z": -0.7183337951413078,
					"_w": 0.6956986120137697,
				}
			})			
	})

	test('animateTo', () => {	
		const bO = new BasicObject();
		bO.renderLoop = new CoreLoop();
		bO.animateTo({scale:2})

		expect(bO.animator.endMatrix.elements) 
			.toEqual([2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,1])

		expect(bO.animator.until)
			.toEqual(250)

		expect(bO.animateTo({scale:1, defer:true}).animator.endMatrix.elements)
			.toEqual([2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,1])
	})

	test('scrubTo', () => {	

		const bO = new BasicObject();
		bO.renderLoop = new CoreLoop();
		bO
			.animateTo({scale:1})
			.scrubTo({pitch:10});

		expect(bO.animator.endMatrix.elements) 
			.toEqual([1,0,0,0,0,0.984807753012208,0.17364817766693033,0,0,-0.17364817766693033,0.984807753012208,0,0,0,0,1])

		expect(bO.setScrubber(0.495).matrix.elements)
			.toEqual([1,0,0,0,0,0.9962703764929413,0.08628636579792337,0,0,-0.08628636579792337,0.9962703764929413,0,0,0,0,1])

		// // TODO scrubto deferring

	})	
})


