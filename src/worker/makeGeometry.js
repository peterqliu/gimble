import {
    workerPool, 
    makeWorkerBlobUrl, 
    deepStringify,
    deepParse,
    parseFn, 
    fnSignifier,
    workerUpdateVisibleTiles
} from '../workerPool.js'

import polylineNormals from 'polyline-normals'

import {tubeUtilities, makeTube} from '../layers/tube.js'

import geometry from '../layers/geometry.js'
import {applyColorAlpha, applyFeatureIndex} from '../layers/geometry.js'

import lineDeps from '../layers/lineDeps.js'
import constant from '../core/constants.js'
import {
    Color,
    Shape,
    Float32BufferAttribute,
    BufferGeometry,
    BufferAttribute,
    Path,
    ExtrudeGeometry,
    Vector3,
    Vector2,
    MathUtils,
    ShapeUtils
} from 'three';

import V3Feature from '../geometry/V3Feature.js'
import V3FeatureCollection from '../geometry/V3FeatureCollection.js'

import GeometryLike from '../geometry/GeometryLike.js'

import TileCoordinate from '../tile/TileCoordinate.js'
import BufferGeometryUtils from '../layers/BufferGeometryUtils.js'

// main thread needs
import state from '../core/state.js'
import {Primitive} from '../layers/mesh.js'
import {addToWorld} from '../ui/threeSetup.js'

// WORKER THREAD CODE. All variables and methods must be declared and transferred
// to worker before using

const _lut = [];

const onMessage = msg => {

    const d = msg.data;

    // on ports setup, have messages trigger makeGeometry 
    const onPortsSetup = () => {
        self.ports.forEach(p=>{
            p.onmessage = msg => makeGeometry(msg.data)
            
        })
    }

    if (d.source === 'geojson') makeGeometry(d)

    const onDepsSetup = () => {

        if (self.polylineMiterUtil) {
            self.polylineMiterUtil = deepParse(self.polylineMiterUtil)
        }

        if (self.stylesheet) parseStylesheet()
    }

    workerUpdateVisibleTiles(

        d, 

        // search abortCache and resurrect aborted geoms, 
        // if they're in the new cohort of visibleTiles
        () => {
            Object.keys(abortCache)
                .forEach(k=>{

                    if (visibleTiles.includes(k)) {

                        abortCache[k]
                            .forEach(record=>packAndPost(...record, true))

                        delete abortCache[k]
                    }
                })
        }
    )

    
    setupBoilerplate(msg, onDepsSetup, onPortsSetup)


}

const makeGeometry = d => {

    const geojsonSource = d.source === 'geojson';
    const style = geojsonSource ? deepParse(d.styleObj) : stylesheet.layers
            .find(l=>l.id === d.id).style;


    // currently unused path (geojson sources on worker)
    if (geojsonSource) {
        console.warn('geojson source on worker')
        const geomFn = geometry[d.layerType];//self[`${d.layerType}Geometry`]
        const objGeom = geomFn(rawGeometry, self);
        
        packAndPost(d, objGeom)

    }

    // tile source
    else {

        const zxy = new TileCoordinate().rebuild(d.zxy);
        const rawGeometry = []
        const outputDimension = constant.geometry.dimensions[d.layerType];

        new V3FeatureCollection()
            .rebuild(d.geometry).g
            .forEach(f => {

                const ft = new GeometryLike(f)
                    .prepareForType(d.layerType, style, zxy, false)

                rawGeometry.push(...ft)
            })

        // if rawGeometry is empty, quit early and note that
        if (rawGeometry.length === 0) {
            postMessage({
                workerId: self.workerId,
                complete: {
                    aborted:true
                }
            }) 

            return        
        }

        if (d.layerType === 'label' || d.layerType === 'circle') {
            d.geometry = {g:rawGeometry};

            // TODO: can fold this into packandpost
            postMessage({
                workerId: self.workerId,
                complete: d
            })

            return
        }
        
        const strCoords = zxy.toCacheKey();

        // d.diagnostic.e_createBuffer = Date.now() - d.diagnostic.mark;
        const geometry = rawGeometry.map((f,i)=>self.geometry[d.layerType](f, i))
        const objGeom = BufferGeometryUtils.mergeBufferGeometries.call(BufferGeometryUtils, geometry) 

        // const tileObsolete = !visibleTiles.includes(strCoords);

        // if (tileObsolete) {

        //     // abortCache stores *arrays* of aborted geometries,
        //     // in tileCoord indices. These will be looked up every time 
        //     // visibleTiles updates from the main thread, and resurrected
        //     // if in view
        //     abortCache[strCoords] = abortCache[strCoords] || [];
        //     abortCache[strCoords].push([d,objGeom]);
            

        //     postMessage({
        //         workerId: self.workerId,
        //         complete: {
        //             aborted:true
        //         }
        //     }) 

        // }

        packAndPost(d, objGeom)
    }

}

// distill buffergeometry into essential attributes/indices, and post back to main thread
// self-recurses if objGeom is an array of separate geoms (labels)

const packAndPost = (payload, objGeom, skipCount) => {

    if (objGeom.length>=0) objGeom.forEach((o, i)=>packAndPost(payload, o, i ===0 ? skipCount : true))

    else {

        payload.skipCount = skipCount
        payload.geometry = {

            index: objGeom.index === null ? undefined : [
                objGeom.index.array, 
                objGeom.index.itemSize, 
                objGeom.index.normalized
            ],

            attributes: Object.entries(objGeom.attributes),
            userData: JSON.stringify(objGeom.userData),
            labelColor: objGeom.labelColor,
        };
        
        postMessage({
            workerId: self.workerId,
            complete: payload
        })
    }
}

const parseStylesheet = () => {
    self.stylesheet.layers.forEach(l=>{

        l.filter = parseFn(l.filter)
        l.style = deepParse(l.style)

    }) 
}

const threeDependencies = {
    Color: Color,
    _colorKeywords: Color.NAMES,

    BufferGeometry: BufferGeometry, 
    ExtrudeGeometry: ExtrudeGeometry,
    Vector2: Vector2,
    Vector3: Vector3,
    MathUtils: MathUtils,
};

export var bufferDependencies = {

    isWorker: true,
    // function parsing utilities
    fnSignifier, fnSignifier,
    parseStylesheet: parseStylesheet,

    makeGeometry: makeGeometry,
    packAndPost: packAndPost,

    // tile streaming utilities
    workerUpdateVisibleTiles: workerUpdateVisibleTiles,
    abortCache: {}, 

}

// geometry primitives
Object.assign(bufferDependencies, 
    threeDependencies, 
    {

        makeTube: makeTube,
        tubeUtilities: tubeUtilities,

        geometry: geometry,
        Vector3: Vector3,
        TileCoordinate: TileCoordinate,

        V3FeatureCollection: V3FeatureCollection,
        V3Feature: V3Feature,
        BufferGeometryUtils: BufferGeometryUtils,
        GeometryLike: GeometryLike,

        applyColorAlpha: applyColorAlpha,
        applyFeatureIndex: applyFeatureIndex
})


Object.assign(
    bufferDependencies,
    lineDeps,
    // ShapeUtilsDeps
)

const geometryScripts = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r125/three.min.js'
]

export const setUpGeometryPool = fetcherGeomChannels => {

    const geometryPool = new workerPool(
        onMessage, 
        bufferDependencies, 
        geometryScripts, 
        constant.workers.geometry
    )

    geometryPool.maps = {};

    geometryPool
        .postEach(
            () => ({receiverPorts: true}), 
            i => fetcherGeomChannels
                .filter((r, rIndex) => rIndex%constant.workers.geometry === i).map(r=>r.port2)
        )

    return geometryPool

}


// reconstruct geometry object from index and attributes as sent from worker

export const rebuildGeometry = d => {

    var g = new BufferGeometry()

    const strippedGeom = d.geometry;

    strippedGeom.attributes.forEach(([name, attr]) => {
        g.setAttribute(name, new BufferAttribute(attr.array, attr.itemSize, false))
    })
    if (strippedGeom.index) g.setIndex(new BufferAttribute(...strippedGeom.index))

    g.userData = JSON.parse(strippedGeom.userData)

    return g
}

