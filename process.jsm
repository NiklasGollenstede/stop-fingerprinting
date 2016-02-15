'use strict'; /* globals Components */
const EXPORTED_SYMBOLS = [ 'addFrame', ];

/**
 * This module is loaded once into every content process by the frame scripts.
 * It is cept up to date with the current exclude list by the main script and listens to window object creations in the content tabs.
 */

const { utils: Cu } = Components;
const { require } = Cu.import('resource://gre/modules/commonjs/toolkit/require.js', { });
const { setTimeout, } = require('sdk/timers');

const fakeAPIs = require('resource://stop-fingerprinting/content.js');

let isInitialized = false;
let console, addMessageListener, removeMessageListener, sendSyncMessage;
let include, exclude;
const frames = new Set;

function addFrame(frame) {
	!isInitialized && initialize(frame);
	frames.add(frame);
	frame.addEventListener('DOMWindowCreated', onDOMWindowCreated);
	frame.addEventListener('unload', onFrameDestroy);
}

function onFrameDestroy({ target: frame, }) {
	console.log('destroing frame');
	frames.delete(frame);
	frame.addEventListener('DOMWindowCreated', onDOMWindowCreated);
	frame.addEventListener('unload', onFrameDestroy);
}

function initialize(frame) {
	({ console, addMessageListener, removeMessageListener, sendSyncMessage, } = frame); // TODO: what happens, if this frame is unloaded?
	console.log('process created');
	const init = sendSyncMessage('@stop-fingerprinting:get-init-state');
	parseState(init[0] || init);
	if (!exclude || !include) { // for some reason the sendSyncMessage returns an empty Array for the first process
		setTimeout(() => {
			const init = sendSyncMessage('@stop-fingerprinting:get-init-state');
			parseState(init[0] || init);
		}, 1);
	}
	addMessageListener('@stop-fingerprinting:state-update', onStateUpdate);
	addMessageListener('@stop-fingerprinting:destroy', onDestroy);
	isInitialized = true;
}

function onStateUpdate(message) {
	parseState(message.data);
}

function parseState(_state) {
	console.log('parseState', _state);
	_state.exclude && (exclude = new RegExp(_state.exclude, 'i'));
	_state.include && (include = new RegExp(_state.include, 'i'));
}

function onDestroy() {
	console.log('destroing process');
	removeMessageListener('@stop-fingerprinting:state-update', onStateUpdate);
	removeMessageListener('@stop-fingerprinting:destroy', onDestroy);
	frames.forEach(frame => onFrameDestroy({ target: frame, }));
}

function onDOMWindowCreated(event) { try {
	const window = event.target || event.subject;
	let url = window.location.href;

	if (!url) {
		if (window.parent && window.parent !== window) {
			console.log('using parent', url = window.parent.location.href);
		} else {
			url = 'about:blank/?reason=not_found';
		}
	}
	console.log('excludes', exclude.source);
	if (!include.test(url) || exclude.test(url)) { console.log('skipping "'+ url +'"'); return; }
	console.log('faking for "'+ url +'"');
	fakeAPIs(window.wrappedJSObject || window);
} catch (error) { console.error(error); } }

