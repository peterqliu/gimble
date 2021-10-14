import state from '../core/state.js'


// the central animation loop for Map.
// runs continuously, and conditionally fires off map/mouse events,
// camera/world movements, scene rerenders, and tile updates as necessary

export default class CoreLoop {

	constructor() {

		Object.assign(this, {

			lastLoop: 0,
			lastRender:0,
			animatingUntil:0,
			beenAnimating: false,
			animationQueue: new Set(),
			tilesNeedUpdate: false,
			worldNeedsUpdate: false,
			cameraNeedsUpdate: false
		})

	}

	setInRenderer(options) {

		this.setup.renderer
			.setAnimationLoop(this.loop.bind(this))
		Object.assign(this, options)
		return this
	}

	// mark loop for rerendering next time
	rerender() {
		this.needsRerender = true;
		return this
	}

	// mark loop for updating camera matrix (whenever map pitches/rotates)
	updateCamera(){
		this.needsRerender = this.cameraNeedsUpdate = true;
		return this
	}

	// mark loop for updating world matrix (whenever map scales/pans)
	updateWorld(){
		this.needsRerender = this.worldNeedsUpdate = true;
		return this
	}

	// mark loop for updating visible tiles (whenever map moves)

	updateTiles() {

		if (state.stylesheet) this.tilesNeedUpdate = true;
		return this
	}

	// keep render flag up until at least a time (whenever map or objects animate)
	animateUntilAtLeast(t) {

		this.animatingUntil = Math.max(t, this.animatingUntil)
		return this

	}

	// expose ability to rerender *off-loop*
	// fire loop before a long task, if we are already behind on a desired framerate

	preemptBeforeLongTask(frameRate) {

		const sinceLastLoop = performance.now()- this.lastLoop;
		const threshold = 1000/(frameRate || 60);

		if (sinceLastLoop > threshold) this.loop()
	
	}

	// for Object3D's ineligible for onBeforeRender,
	// stash a reference to them in the render loop, and have that call the function
	addToAnimationQueue(obj){

		this.animationQueue.add(obj)
		this.rerender();
		return this
	}


	iterateAnimationQueue() {

		for (let item of this.animationQueue) {

			const a = item.animator;

			// if item is ending
			if (a.until < state.getU('now'))  {
				this.animationQueue.delete(item)

			}

			a.coreLoopAnimation(item, this.setup);

		}

		return this
	}

	isAnimating() {
		return this.animatingUntil >= state.getU('now')
	}

	loop() {

		const now = performance.now();
		this.lastLoop = state.uniforms.now.value = now;

		this.eventDispatcher(this.setup.renderer.domElement);

		if (this.needsRerender) {

			var isAnimating = this.isAnimating()

			// if camera was rotated since last loop
			if (this.cameraNeedsUpdate) {
				this.update.camera.call(this.setup);
				this.cameraNeedsUpdate = false;
			}

			// if world was panned since the last loop
			if (this.worldNeedsUpdate) {
				this.update.world.call(this.setup, state.camera.worldPanDelta);
				this.worldNeedsUpdate = false;
			};


			// if running a animation, 
			// step through both animating objects and mapAnimation (if applicable)
			if ( isAnimating || this.beenAnimating) {

				this.beenAnimating = isAnimating;

				this
					.iterateAnimationQueue()
					.mapAnimation.step.call(this.setup);

			}

			// turn off rerender only if lazyRendering, and no longer animating
			if (state.startSettings.lazyRender && !this.isAnimating()) {
				this.needsRerender = false;
			}
			
			// render the scene
			this.setup.renderer
				.render( this.setup.scene, this.setup.camera )

			this.lastRender = now;
			this.onRender?.()
		
		}

		if (this.tilesNeedUpdate) {
			this.update.tiles(this.map);
			this.tilesNeedUpdate = false;
		}

		this.onLoop?.()

	}
}

