'use strict'; /* globals Components, frames: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ];
const namespace = 'stop-fingerprinting-content';
const __dirname = 'resource://stop-fingerprinting/content';
const __fielname = __dirname +'/process.jsm'; // which is __URL__

const global = this;
const { classes: Cc, interfaces: Ci, utils: Cu, } = Components;
Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/Timer.jsm");
Cu.import("resource://gre/modules/MatchPattern.jsm"); /* global MatchPattern */
Cu.import("resource://gre/modules/BrowserUtils.jsm"); /* global BrowserUtils */

try { Cu.unload('resource://stop-fingerprinting/webextension/node_modules/es6lib/port.js'); } catch (_) { }
const { es6lib_port: Port, } = Cu.import('resource://stop-fingerprinting/webextension/node_modules/es6lib/port.js', { });

let port = null, needsReload = false;
const frames = new Map;
const resolved = Promise.resolve();
const allUrls = new MatchPattern('<all_urls>');
const amoUrl  = new MatchPattern('https://addons.mozilla.org/*');

console.log('process.jsm loading', this);

const messageHandlers = {
	destroy() {
		console.log('process script destroy');
		try { // try to unload, if it fails the process.js will unload the next it loads
			Cu.unload(__fielname);
		} catch (error) { needsReload = true; } // see https://bugzilla.mozilla.org/show_bug.cgi?id=1195689

		// remove all listeners
		port.destroy(); port = null;

		// detach from all frames
		frames.forEach(_=>_.destroy());
		frames.clear();
	},
};

function init(cpmm) { // called once by ./process.js directly after (re-)loading this module
	console.log('process script init', cpmm);
	port = new Port({
		in: cpmm, out: null,
		namespace,
	}, Port.moz_nsIMessageListenerManager);
	port.addHandlers(messageHandlers);
}

function reload() { // this is called by ./process.js to ensure that it gets a fresh module
	needsReload && Cu.unload(__fielname);
}

function addFrame(cfmm) { // called by ./frame.js for every frame it is loaded in
	new Frame(cfmm);
}


class Frame {
	constructor(cfmm) {
		if (frames.has(cfmm)) { throw new Error('duplicate frame'); }
		frames.set(cfmm, this);
		this.cfmm = cfmm;
		this.cfmm.addEventListener('DOMWindowCreated', this);
		this.cfmm.addEventListener('unload', this);
		this.top = null; // the top level window, if its url isScriptable
		this.utils = null; // nsIDOMWindowUtils of .top
		this.pageUtils = new PageUtils(this);
		this.pauseTokens = new Set; // used by this.pageUtils. cleared on topWindowCreated
		this.onDOMWindowCreatedListeners = new Set; // used by this.pageUtils. cleared on topWindowCreated
		console.log('created Frame', this);
	}

	destroy() {
		console.log('destroying Frame', this);
		frames.delete(this.cfmm);
		this.cfmm.removeEventListener('DOMWindowCreated', this);
		this.cfmm.removeEventListener('unload', this);
	}
	onunload() { this.destroy(); }

	handleEvent(event) {
		try {
			return this['on'+ event.type](event);
		} catch (error) { console.error('on'+ event.type +' threw', error); }
	}

	onDOMWindowCreated(event) {
		const cw = event.target.defaultView;

		if (cw.location.protocol === 'moz-extension:') { extendWebExtWindow(cw); } // TODO: find a way to identify this extension

		if (cw.top === cw) { // TODO: verify that this is true exactly iff cw is the tabs top level frame
			return this.topWindowCreated(cw);
		}

		const ucw = Cu.waiveXrays(cw);
		this.onDOMWindowCreatedListeners.forEach(listener => {
			try { listener(ucw); } // will be xRayed again // TODO: XXX: for some iframes it will be wrapped in an opaque wrapper
			catch (error) { try { console.error('onDOMWindowCreated listener threw', error); } catch (_) { throw error; } }
		});
	}

	topWindowCreated(cw) {
		console.log('topWindowCreated', cw);
		this.top = null;
		this.utils = null;
		this.pauseTokens.clear();
		this.onDOMWindowCreatedListeners.clear();

		if (!isScriptable(cw) && cw.document.URL !== 'about:blank') { console.log('skipping non-content tab', this); return; }

		this.top = cw;
		this.utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		const ucw = Cu.waiveXrays(cw);

		ucw.getPageUtils = Cu.exportFunction(caller => {
			delete ucw.getPageUtils;
			return Cu.cloneInto(this.pageUtils, caller, { cloneFunctions: true, });
		}, ucw, { allowCrossOriginArguments: true, });

	}
}

function PageUtils(frame) {

	// ???: is utils.setCSSViewport() callable and useful?

	const api = ({
		pause() {
			if (frame.pauseTokens.size === 0) {
				console.log('pausing now');
				frame.utils.suppressEventHandling(true);
				frame.utils.suspendTimeouts();
			}
			const token = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
			frame.pauseTokens.add(token);
			// console.log('pausing', frame.pauseTokens.size);
			return token;
		},
		resume(token) {
			const removed = frame.pauseTokens.delete(token);
			if (frame.pauseTokens.size === 0) {
				console.log('resuming now');
				frame.utils.suppressEventHandling(false);
				frame.utils.resumeTimeouts();
			}
			// console.log('resuming', frame.pauseTokens.size);
			return removed;
		},
		onDOMWindowCreated: {
			addListener(func) {
				checkType(func, 'function');
				frame.onDOMWindowCreatedListeners.add(func);
			},
			removeListener(func) {
				return frame.onDOMWindowCreatedListeners.delete(func);
			}
		},
		utils: {
			makeSandboxFor(cw) {
				checkType(cw, 'object', 'context');
				const ucw = Cu.waiveXrays(cw);
				return Cu.Sandbox(ucw, {
					sameZoneAs: ucw,
					sandboxPrototype: ucw,
					wantXrays: false,
				});
			},
			evalInSandbox: Cu.evalInSandbox,
			// waiveXrays: Cu.waiveXrays, // this doesn't work
			getGlobalForObject: Cu.getGlobalForObject,
		},
		timers: {
			setTimeout, clearTimeout,
			setInterval, clearInterval,
		},
	});

	function checkType(value, type, name = 'argument') {
		if (typeof value !== type) { throw new TypeError(`"${ name }" must be a ${ type } (?)`); }
	}

	return api;
}

function extendWebExtWindow(cw) {
	const ucw = Cu.waiveXrays(cw);
	ucw./*browser.tabs.*/isScriptable = Cu.exportFunction(function(url) {
		try {
			const nsIURI = BrowserUtils.makeURI(url);
			return allUrls.matches(nsIURI) && !amoUrl.matches(nsIURI);
		} catch (error) {
			console.error('isScriptable ', url, ' threw', error);
			return false;
		}
	}, ucw, { allowCrossOriginArguments: true, });
}

function parseError(string) {
	if (typeof string !== 'string' || !string.startsWith('$_ERROR_$')) { return string; }
	const object = JSON.parse(string.slice(9));
	const error = Object.create((object.name ? global[object.name] || Error : Error).prototype);
	Object.assign(error, object);
	return error;
}

function isScriptable(cw) {
	try {
		const url = cw.document.URL;
		if (url == null) { console.warn('isScriptable called with null url'); return false; }
		if (url.length === 0) { console.warn('isScriptable called with empty url'); return false; }
		const nsIURI = BrowserUtils.makeURI(url);
	// 	return allUrls.matches(nsIURI) && !amoUrl.matches(nsIURI);

		if (allUrls.matches(nsIURI) && !amoUrl.matches(nsIURI)) {
			return true;
		} else {
			console.log('unscriptable window', cw, url, cw.location, cw.opener);
			// TODO: after `window.open()` the new windows url is`'about:blank' (and thus unscriptable) but the `window.opener` is already set.
			// so this function should probably return isScriptable(cw.opener)
			// but TODO: test if this is the only case where `window.opener` is set
			return false;
		}
		// it might be worth a bug report that causing a reference error here (window) crashes the entire browser (and prevents it from starting)
	} catch (error) {
		console.error('isScriptable ', cw, ' threw', error);
		return false;
	}
}

function ErrorLogger(error) {
	console.error('uncaught (in Promise):', error);
	throw error;
}
