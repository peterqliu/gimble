import {
    workerPool, 
    fnSignifier, 
    parseFn, 
    workerUpdateVisibleTiles
} from '../workerPool.js'

import state from '../core/state.js'
import constant from '../core/constants.js'

// worker dependencies
import Tile from '../data/Tile.js'
import {vectorTile, classifyRings} from './dependencies/vectorTile.js'

import V3FeatureCollection from '../geometry/V3FeatureCollection.js'
import V3Feature from '../geometry/V3Feature.js'

import {Color, Vector3} from 'three'
import TileCoordinate from '../tile/TileCoordinate.js'

import Pbf from './dependencies/pbf.js'
import ieee754 from 'ieee754'


export const onMessage = msg => {

    const d = msg.data;

    if (setupBoilerplate(msg, undefined)) {

        if (d.define?.stylesheet) {
            stylesheet.layers
                .forEach(l=>l.filter = parseFn(l.filter))
        }

        return
    }

    if (workerUpdateVisibleTiles(d)) return

    if (d.manualTileLoad) {

        Object.assign(d.manualTileLoad, {
            onComplete: t => postMessage({
                manualTileLoad:{
                    lookupKey: d.manualTileLoad.lookupKey,
                    tile: t
                }
            })
        })

        const manualTile = new Tile(d.manualTileLoad)

        return
    }

    // DEFINITION
    // d = {
    //     s: source,
    //     c: tile coords
    // }

    d.diagnostic.b_messageToFetcher = Date.now() - d.diagnostic.mark;
    d.diagnostic.mark = Date.now(); 

    const zxy = new TileCoordinate().rebuild(d.c)
    const strCoords = [zxy.x, zxy.y, zxy.z].join('/');
    const lookupString = `${d.s}_${strCoords}`

    // function to execute when parser finishes one tilestylelayer
    // returns a boolean that conditionally increments anticipated geometry count
    // (false if tile is obsolete)

    const onParsedGeometry = payload => {

        const tileObsolete = !visibleTiles.includes(strCoords);

        if (tileObsolete) {
            abortTileStyleLayer(d.s, strCoords, payload.id, payload)
            return false
        };

        payload.diagnostic = d.diagnostic;
        payload.diagnostic.c_parseTile = Date.now() - payload.diagnostic.mark;
        d.diagnostic.mark = Date.now();    
 
        anticipateGeometries(payload.length)

        // pass raw geometry to geometry worker

        const portQuant = self.ports.length;
        const randomNum = Math.floor(Math.random()*(portQuant+1)) % portQuant;

        self.ports[randomNum]
            .postMessage(payload)

        return true

    };

    // notifies main thread of how many geoms to anticipate
    // from this tile
    const anticipateGeometries = n => {

        postMessage({
            anticipate: {
                geometries: n,
                tileCoords: strCoords
            }
        })
    };

    // if this tile has been previously downloaded
    if (tileCache[lookupString]) {

        var geometriesSent = 0;
        const abortEntry = abortCache[lookupString];

        // check if there are any aborted style layers in this tile
        if (abortEntry) {

            Object.keys(abortEntry)
                .forEach(k=>{
                    const tileStyleLayer = abortEntry[k];
                    geometriesSent++
                    onParsedGeometry(tileStyleLayer);
                })

            delete abortCache[lookupString]

        }

        anticipateGeometries(geometriesSent)

        return
    }

    cacheTile(d.s, 'tile', zxy)
    const tileUrl = stylesheet.sources[d.s].tiles[0]
        .replace('{z}', zxy.z)
        .replace('{x}', zxy.x)
        .replace('{y}', zxy.y)

    const t = new Tile({

        url: tileUrl,
        zxy: zxy,
        source: d.s,
        targetMap: d.targetMap,
        stylesheet:stylesheet,
        onComplete: onParsedGeometry // parsed tile gets sent out here

    })


}


// cache the downloaded tile data into worker's local memory

const cacheTile = (source, tile, zxy) => self.tileCache[`${source}_${zxy.toCacheKey()}`] = 'tile';

const dependencies = {

    Pbf: Pbf,
    ieee754: ieee754,
    isWorker: true,
    classifyRings: classifyRings,

    Vector3: Vector3,
    Tile: Tile,
    TileCoordinate: TileCoordinate,
    fnSignifier: fnSignifier,
    vectorTile: vectorTile,
    cacheTile: cacheTile,
    workerUpdateVisibleTiles: workerUpdateVisibleTiles,
    visibleTiles:'',
    visibleTilesTimestamp:0,

    V3FeatureCollection: V3FeatureCollection,
    V3Feature: V3Feature,
    // GeometryLike: GeometryLike,

    tileCache: {},
    abortCache: {},

    // _colorKeywords: Color.NAMES,

    abortTileStyleLayer: (source, zxy, id, msg) => {

        const string = `${source}_${zxy}`
        self.abortCache[string] = self.abortCache[string] || {};
        self.abortCache[string][id] = msg

    }

}

export const setUpFetcherPool = fetcherGeomChannels => {

    const fetcherPool = new workerPool(onMessage, dependencies, [], constant.workers.fetcher)

    // post channel emitters to fetchers

    fetcherPool
        .postEach(
            () => {
                return {senderPorts: true}
            }, 

            i => fetcherGeomChannels
                .slice(i*constant.workers.geometry, (i+1)*constant.workers.geometry).map(s=>s.port1)
        )
        .postAll({
            define: {
                constant:constant
            }
        })
    return fetcherPool
}

