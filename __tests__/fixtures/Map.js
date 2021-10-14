/**
 * @jest-environment jsdom
 */
import {jest} from '@jest/globals'
import gimbleMap from '../../src/ui/map.js'


export const mockRenderer = {
	domElement:document.createElement('canvas'),
	setSize:(x,y)=>'mock this sometime',
	setClearColor:(x,y)=>'mock this sometime',
	setPixelRatio:(x,y)=>'mock this sometime',
	setAnimationLoop:(x,y)=>'mock this sometime',

	shadowMap: {}
}

const mockContainer = document.createElement('div');
jest
	.spyOn(mockContainer, 'scrollHeight', 'get')
	.mockImplementation(() => 200);
jest
	.spyOn(mockContainer, 'scrollWidth', 'get')
	.mockImplementation(() => 300);

export const defaultMap = new gimbleMap({
	container: mockContainer,
	renderer: mockRenderer,
})

export const map = new gimbleMap({
	container: mockContainer,
	renderer: mockRenderer,
	background:'#eed',
	bearing:27,
	zoom:0.2,
	center:[12,34],
	pitch: 16
})