import state from '../core/state'
import {Matrix4} from 'three'


const bindAnimationUtilities = (material) => {
	
	material.uniforms = {
		startTime:{ value: 1 },
		duration: { value: 250 },
		startMatrix: {value: new Matrix4()},
		endMatrix: {value: new Matrix4()}
	}

	material.onBeforeCompile = (s,r) => {

		// universal uniforms

		s.uniforms.now = state.uniforms.now;
		s.uniforms.worldMatrix = state.uniforms.worldMatrix;
		s.uniforms.worldStartMatrix = state.uniforms.worldStartMatrix;

		s.uniforms.cameraStartMatrix = state.uniforms.cameraStartMatrix;
		s.uniforms.cameraAnimationMatrix = state.uniforms.cameraAnimationMatrix;

		s.uniforms.worldAnimationDuration = state.uniforms.worldAnimationDuration;
		s.uniforms.worldAnimationStartTime = state.uniforms.worldAnimationStartTime;

		// mesh-specific uniforms

		s.uniforms.startTime = material.uniforms.startTime;
		s.uniforms.duration = material.uniforms.duration;
		s.uniforms.localStartMatrix = material.uniforms.startMatrix;
		s.uniforms.localEndMatrix = material.uniforms.endMatrix;


		s.vertexShader = s.vertexShader
			.replace(
				'#include <bsdfs>', 
				`#include <bsdfs>

				uniform float now;
				uniform float animateUntil;

				uniform mat4 cameraStartMatrix;

				uniform mat4 worldMatrix;
				uniform mat4 worldStartMatrix;
				uniform float worldAnimationDuration;
				uniform float worldAnimationStartTime;

				uniform float startTime;
				uniform float duration;
				uniform mat4 localStartMatrix;
				uniform mat4 localEndMatrix;`
			)
			.replace(
				'#include <project_vertex>',

				`vec4 mvPosition = vec4( transformed, 1.0 );

				#ifdef USE_INSTANCING

					mvPosition = instanceMatrix * mvPosition;

				#endif

				float worldAnimationProgress = clamp(now - worldAnimationStartTime, 0.0, worldAnimationDuration) / worldAnimationDuration; 
				mat4 cameraAnimationMatrix = (cameraStartMatrix * (1.0 - worldAnimationProgress)) + (viewMatrix * worldAnimationProgress);

				// if no animations are happening, use built-in modelMatrix to position object statically
				if (now >= startTime + duration) gl_Position = projectionMatrix * cameraAnimationMatrix * modelMatrix * vec4(position, 1.0);
				

				// if something is animating, interpolate world and model matrices as appropriate
				else {
					
					float progress = clamp(now - startTime, 0.0, duration) / duration;

					mat4 worldAnimationMatrix = (worldStartMatrix * (1.0 - worldAnimationProgress)) + (worldMatrix * worldAnimationProgress);
					mat4 modelAnimationMatrix = (localStartMatrix * (1.0 - progress)) + (localEndMatrix * progress);
					gl_Position = projectionMatrix * cameraAnimationMatrix * worldAnimationMatrix * modelAnimationMatrix * vec4(position, 1.0);

				}`

			)
	}
}



export default bindAnimationUtilities;

