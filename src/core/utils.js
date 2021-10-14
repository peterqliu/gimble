import {Matrix4, Vector3, Quaternion} from 'three'

const utils = {

	// takes an input object, along with a canonical object with keys and default values
	// produces an object with keys of default set, and values of default unless overwritten by input
	// output does not have keys or values not in the original canonical default

	applyDefaults(input, defaultSet) {

		var output = {};

		Object.keys(defaultSet)
			.forEach(k=>{

				const inputValueExists = input[k] !== undefined;
				const defaultValueExists = defaultSet[k] !== undefined;

				if (defaultValueExists) output[k] = inputValueExists ? input[k] : defaultSet[k]
				else if (inputValueExists) output[k] = input[k]

			})

		return output
	},

	validateOnce(input, standardEntry, key) {
		// if wrong type, throw
		if (standardEntry.type && !standardEntry.type.includes(typeof input)) throw `Parameter ${key} must be of type ${standardEntry.type.join(' or ')}`

		// if not in approved list, throw
		if (standardEntry.oneOf && !standardEntry.oneOf.includes(input)) {
			throw `Parameter '${key}' must be ${standardEntry.oneOf.join(' or ')}`
		}
	
		// if an invalid value, throw
		if (standardEntry.value && !standardEntry.value(input)) {
			throw `Parameter '${key}' is of invalid value`
		}

		return input
	},

	validate(input, standard) {

		if (!input) {
			if (standard._required)	throw 'Input is required'
		}

		else {

			var [inputKeys, standardKeys] = [input, standard].map(o=>Object.keys(o))

			standardKeys.forEach(key => {
		
					const standardEntry = standard[key]
					// if input is missing parameter
					if (!inputKeys.includes(key)) {
		
						// if param is required, throw
						if (standardEntry.required) throw `Missing required parameter "${key}"`
					}
		
					// if input has parameter
					else utils.validateOnce(input[key], standardEntry, key)
				})
		}

		return input
	},

	// utility to compose matrix from position/quaternion/scale
	// a thin wrapper around the Matrix4 method that provides default values
	composeMatrix(position, quaternion, scale) {
		const q = new Matrix4()
			.compose(
				position || new Vector3(), 
				quaternion || new Quaternion(), 
				scale || new Vector3(1,1,1)
			);
		return q
	}
};

export default utils