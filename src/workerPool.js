import state from './core/state.js'

export class workerPool {

    constructor(fn, dependencies, scripts, quantity) {

        this.working = new Array(quantity).fill(false);
        this.workerBacklog= new Array(quantity).fill(0);
        this.worker = [];

        const blob = makeWorkerBlobUrl(fn, dependencies, scripts);

        this.working
            .forEach((worker,i)=>{

                const w = new Worker(blob);
                this.worker.push(w);

                w.postMessage({
                    define: {workerId: i}
                })
            })
    };

    // post definitions to all workers
    define(msg) {
        this.postAll({define:msg})
        return this
    }

    // post message to specific worker
    postTo(msg, workerId) {

        this.worker[workerId]
            .postMessage(msg)

    }

    // post same content to all workers
    postAll(msg, ports) {

        this.postEach(
            ()=> msg, 
            ()=> ports
        )

        return this
    }

    // post content to each worker, conditional on worker id
    postEach(msgFn, portsFn) {

        this.worker.forEach((w,i)=>{
            const ports = portsFn(i)
            w.postMessage(msgFn(i), ports)
        })

        return this
    }

    // function to run when workers message back
    onMessage(cb, debugFn) {
        this.worker.forEach(w => {
            w.addEventListener('message', msg => {

                const start = performance.now();
                const d = msg.data;
                const decodeTime = performance.now() - start;
                if (debugFn) debugFn(d.workerId, d, decodeTime)

                if (d.amIdle) {
                    this.working[d.workerId] = false; 
                    this.workerBacklog[d.workerId]--;
                }
                
                cb?.(d)
            })
        })

        return this
    }

    // post to idle worker 
    post(msg, ports, debugFn) {

        const everyoneBusy = this.working.indexOf(false) === -1;
        const assignedWorkerIndex = everyoneBusy ? Math.round(Math.random()*(quantity-1)) :pool.working.indexOf(false);

        const assignedWorker = this.worker[assignedWorkerIndex];
        assignedWorker.postMessage(msg, ports);

        if (debugFn) debugFn(assignedWorkerIndex)
        this.working[assignedWorkerIndex] = true;
        this.workerBacklog[assignedWorkerIndex]++;

        return this
    }
}


// method to run to set up workers with bindings and messaging ports, and callbacks after each.
// returns a boolean that short-circuits the worker for messages establishing definitions
const setupBoilerplate = (msg, defineCb, portsCb) => {

    const d = msg.data;

    // messages with `define` key will stash their values in the worker root scope (used for stylesheet and constant)
    if (d.define) {

        Object.entries(d.define)
            .forEach(([name, obj])=>self[name] = obj)

        if (defineCb) defineCb()
        return true
    }

    else if (d.senderPorts || d.receiverPorts) {
        // console.log(d)
        self.ports = msg.ports
        
        portsCb?.(d)
        return true
    }

    // if not an define or ports message, returns false to signal worker to proceed
    else return false    
}

// takes an object containing dependency libraries, and combines it with the main function to create blob for worker
export const makeWorkerBlobUrl = (fn, dependencies, scriptImports) => {

	// convert dependencies object to single string, in repeated key=fn() format
    // console.log(dependencies.Pbf, typeof dependencies.Pbf, dependencies.Pbf.toString(), )
	const deps = Object.entries(dependencies)
		.map(([k,v]) => `\n\n${k} = ${typeof v === 'function' ? v.toString() : `deepParse(${JSON.stringify(deepStringify(v))})`};`);

	//  create blob with imported scripts, main onMsg function, and dependency methods
	var blobPayload = [
        // imported scripts
		`importScripts(${scriptImports.map(s=>`"${s}"`).join(',')});`, 

        // parser utilities

        '\nconst deepParse = ', deepParse.toString(),
        '\nconst parseFn = ', parseFn.toString(),

        // boilerplate for messagechannels and stylesheet declarations
        '\nconst setupBoilerplate = ', setupBoilerplate.toString(),

        // main function for message handling
		'\nself.onmessage = ', fn.toString(),

        // dependencies for worker
		...deps
	];

	var blob = new window.Blob(
		blobPayload, 
		{ type: 'module' }
	);

	var url = URL.createObjectURL(blob);
	return url

};

// recurse into an object, and reparse all stringified functions it encounters

export const deepParse = input => {

    if (typeof input === 'object') {

        if (Array.isArray(input)) return input.map(item=>deepParse(item))
        else {
            var output = {}

            Object.keys(input)
                .forEach(k=>output[k] = deepParse(input[k]))

            return output
        }
    }

    else return parseFn(input)
}

// recurse into an object, and stringify all functions it encounters
export const deepStringify = input => {
    // console.log('ds', input)
    if (typeof input === 'object') {

        if (Array.isArray(input)) return input.map(item=>deepStringify(item))
        else {
            var output = {}

            Object.keys(input)
                .forEach(k=>output[k] = deepStringify(input[k]))
            // console.log(output)
            return output
        }
    }

    else if (typeof input === 'function') return stringifyFn(input)

    else return input
}

// prepended string to denote stringified function (to be reparsed in worker)
export const fnSignifier = ()=>`_fn:`

// convert function to string, to send to web worker
export const stringifyFn = fn => `${fnSignifier()}${fn.toString()}`



// convert stringified function back into function form. 
// wraps original fn in outer function, in order to recover original argments
export const parseFn = v => {

    var signifier = `_fn:`;

    if (v?.includes?.(signifier)) {
        const fnText = v.replace(signifier, '');
        return new Function(`const fn = `+fnText+`;\nreturn fn(...arguments)`)
    }
    else return v
}

export const workerUpdateVisibleTiles = (d, cb) => {

    if (!d.visibleTiles) return false

    if (self.visibleTilesTimestamp && d.visibleTiles.timestamp < visibleTilesTimestamp) {
        console.error('New tiles are staler than current')
        return true
    }

    visibleTiles = d.visibleTiles.tiles;
    visibleTilesTimestamp = d.visibleTiles.timestamp;

    if (cb) cb()
    return true

}


