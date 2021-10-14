
export const makeTube = ft => {

 	const arm = ft.g.map(p => new THREE.Vector3(p.x, p.y, p.z));

	const ray = new THREE.Ray();
	const radius = ft.s.radius;
	const sides = ft.s.sides;

	// form initial ring of points and rotate/translate them into place
	const circle = new THREE.CircleGeometry(radius,sides);

	circle.lookAt(tubeUtilities.vector3Delta(arm[1], arm[0]));
	circle.translate(arm[0].x, arm[0].y, arm[0].z);

	var jointPoints = tubeUtilities.extractJointPoints(circle);
	var jointRings = [jointPoints];

	// iterate through all the joints and project previous joint points to next elbow
	for (var i = 0; i<arm.length-1; i++) {

		jointPoints = tubeUtilities.projectToElbow(
			jointPoints,
			[arm[i], arm[i+1], arm[i+2]],
			ray
		);	

		jointRings.push(jointPoints);

	}

	const output = tubeUtilities.generateTorso(jointRings, arm.length, sides)
	return output

};

export const tubeUtilities = {

	// taking points from previous joint (shoulder), project them to the plane
	// on which the next joint (elbow) sits
	projectToElbow: (shoulderPoints, arm, ray) => {

		const elbowPlane = tubeUtilities.makeElbowPlane(arm);
		const [shoulder, elbow, wrist] = arm;

		const shoulderToElbow = tubeUtilities.vector3Delta(elbow, shoulder)
			.normalize();

		const elbowPoints = shoulderPoints
			.map(v3 => {
				ray.set(v3, shoulderToElbow);
				const intersect = new THREE.Vector3();
				var i = ray.intersectPlane(elbowPlane, intersect);

				if (!i) console.warn('No intersect found. consider reducing tube radius.')

				return i || elbow
			})

		return elbowPoints
	},

	// takes trios of line vertices, and returns the coplanar plane
	makeElbowPlane: v3s => {

		// construe trio of points as arm joints
		const [shoulder, elbow, wrist] = v3s;
		var plane = new THREE.Plane();

		// last point as an elbow would have no wrist
		// plane should face shoulder (second to last vertex in the line)
		if (!wrist) {
			const elbowToShoulder = tubeUtilities.vector3Delta(shoulder, elbow);
			return plane.setFromNormalAndCoplanarPoint(elbowToShoulder, elbow)
		}

		//compute normal of plane passing through all three joints
		plane.setFromCoplanarPoints(...v3s)
		const armNormal = plane.normal
			.clone()
			.add(elbow);


		// determine point between shoulder and wrist that
		// when connected to elbow with a line, perfectly bisects the elbow angle
		// TODO: can precompute this in main method, to avoid normalizing each segment twice

		const normalizedBones = [shoulder, wrist]
			.map(j=>tubeUtilities.vector3Delta(j,elbow).normalize())

		const shoulderWristBisector = new THREE.Vector3()
			.addVectors(...normalizedBones)
			.divideScalar(2)
			.add(elbow);

		// elbow plane defined by elbow, vector normal to arm plane, and midpoint
		return plane.setFromCoplanarPoints(shoulderWristBisector, armNormal, elbow)	
	},

	vector3Delta: (b, a) => new THREE.Vector3().subVectors(b,a),

	extractJointPoints: joint => {

		var points = [];
		const array = joint.attributes.position.array;
		for (var i=3; i<array.length-3; i+=3) {
			points.push(new THREE.Vector3(array[i], array[i+1], array[i+2]))
		}

		return points
	},

	generateTorso: (pointStack, joints, faces) => {

		// buffers

		const indices = [];
		const vertices = [];
		const normals = [];
		const uvs = [];

		const normal = new THREE.Vector3()
		// helper variables

		let index = 0;
		const indexArray = [];

		// generate vertices, normals and uvs

		for ( let y = 0; y <= joints-1; y ++ ) {

			const indexRow = [];
			const v = y / joints;

			// calculate the radius of the current row

			for ( let x = 0; x <= faces; x ++ ) {

				const u = x / faces;

				const theta = u * Math.PI * 2;

				const pt = pointStack[y][x % faces];
				vertices.push( pt.x, pt.y, pt.z );

				// normal
				const sinTheta = Math.sin( theta );
				const cosTheta = Math.cos( theta );

				normal.set( sinTheta, 0, cosTheta ).normalize();
				normals.push( normal.x, normal.y, normal.z );

				// uv

				uvs.push( u, 1 - v );

				// save index of vertex in respective row

				indexRow.push( index ++ );

			}

			// now save vertices of the row in our index array

			indexArray.push( indexRow );

		}

		// generate indices

		for ( let x = 0; x < faces; x ++ ) {

			for ( let y = 0; y < joints-1; y ++ ) {

				// we use the index array to access the correct indices

				const a = indexArray[ y ][ x ];
				const b = indexArray[ y + 1 ][ x ];
				const c = indexArray[ y + 1 ][ x + 1 ];
				const d = indexArray[ y ][ x + 1 ];

				// faces

				indices.push(b, a, d );
				indices.push(c, b, d );

			}

		}

		const geom = new THREE.BufferGeometry();
		geom.setIndex(indices);
		geom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geom.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
		geom.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

		return geom
	}
}

export default tubeUtilities