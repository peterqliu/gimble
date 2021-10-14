import state from '../core/state'
import bindAnimationUtilities from './AnimationMaterial'
import {MeshLambertMaterial, Matrix4} from 'three'


class LambertAnimationMaterial extends MeshLambertMaterial{

	constructor() {
		
		super({vertexColors:true})
		bindAnimationUtilities(this)

	}
}

export default LambertAnimationMaterial
