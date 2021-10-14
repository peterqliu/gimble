/**
 * @jest-environment jsdom
 */

import {jest} from '@jest/globals'


global.Worker = function () {
	return {
		postMessage: jest.fn(),
		addEventListener: jest.fn()
	};
};

const MessageChannel = function () {
	return {
		port1: jest.fn(),
		port2: jest.fn(),
	};
};

global.MessageChannel = MessageChannel;
global.onmessage = jest.fn();


const URL = {
	createObjectURL: jest.fn(),
}

global.URL = URL;


test('Placeholder', ()=>expect(true).toEqual(true))