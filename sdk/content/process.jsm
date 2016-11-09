'use strict'; /* globals Components, frames: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ];
const namespace = 'stop-fingerprinting-content';
const __resource = 'resource://stop-fingerprinting';
const __dirname = __resource +'/content';
const __fielname = __dirname +'/process.jsm'; // which is __URL__

const global = this;
const { classes: Cc, interfaces: Ci, utils: Cu, } = Components;
Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/Timer.jsm");
Cu.import("resource://gre/modules/MatchPattern.jsm"); /* global MatchPattern */
Cu.import("resource://gre/modules/BrowserUtils.jsm"); /* global BrowserUtils */

const Port = require('webextension/node_modules/es6lib/port.js');
const { _async, spawn, sleep, asyncClass, Resolvable, } = require('webextension/node_modules/es6lib/concurrent.js');

let port = null, needsReload = false;
const getWebExtId = new Resolvable; let webExtOrigin = null;
const getWebExtStarted = new Resolvable; let webExtStarted = false;
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
	console.log('process script init', ...arguments);
	port = new Port({
		in: cpmm, out: cpmm,
		namespace,
	}, Port.moz_nsIMessageListenerManager);
	port.addHandlers(messageHandlers);

	port.request('getWebExtId')
	.then(webExtId => {
		webExtOrigin = 'moz-extension://'+ webExtId;
		getWebExtId.resolve();
		console.log('got webExtId', webExtId);
	}).then(() => port.request('getWebExtStarted'))
	.then(() => {
		webExtStarted = true;
		getWebExtStarted.resolve();
		console.log('starting process.jsm');
	})
	.catch(error => { getWebExtId.reject(error); getWebExtStarted.reject(error); console.error(error); });
}

function reload() { // this is called by ./process.js to ensure that it gets a fresh module
	needsReload && Cu.unload(__fielname);
}

function addFrame(cfmm) { // called by ./frame.js for every frame it is loaded in
	new Frame(cfmm);
}


const Frame = asyncClass({
	constructor: class { constructor(cfmm) {
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
	} },

	destroy() {
		console.log('destroying Frame', this);
		frames.delete(this.cfmm);
		this.cfmm.removeEventListener('DOMWindowCreated', this);
		this.cfmm.removeEventListener('unload', this);
	},
	onunload() { this.destroy(); },

	handleEvent(event) {
		try {
			return this['on'+ event.type](event);
		} catch (error) { console.error('on'+ event.type +' threw', error); }
	},

	onDOMWindowCreated: _async(function*(event) {
		console.log('onDOMWindowCreated', event);
		const cw = event.target.defaultView;

		if (cw.top === cw) { // TODO: verify that this is true exactly iff cw is the tabs top level frame
			this.topWindowCreated(cw);
		}

		if (webExtOrigin == null) { // pause until the WebExtension is started far enough to know it's id
			console.log('pausing');
			const token = this.pauseRenderer();
			try {
				(yield getWebExtId);
			} catch (error) { throw error; } // TODO: user interaction
			this.resumeRenderer(token);
			console.log('resumed');
		} // webExtOrigin is not null anymore

		if (cw.location.origin === webExtOrigin) { extendWebExtWindow(cw); }

		const ucw = Cu.waiveXrays(cw);
		this.onDOMWindowCreatedListeners.forEach(listener => {
			try { listener(ucw); } // will be xRayed again // TODO: XXX: for some iframes it will be wrapped in an opaque wrapper
			catch (error) { try { console.error('onDOMWindowCreated listener threw', error); } catch (_) { throw error; } }
		});
	}, { callSync: true, }),

	topWindowCreated: _async(function*(cw) {
		console.log('topWindowCreated', cw);

		// remove the previous window and all related resources
		this.top = this.utils = null;
		this.pauseTokens.clear();
		this.onDOMWindowCreatedListeners.clear();

		port.request({ sender: this.cfmm, }, 'ping', 42).then(value => console.log('pong', value)).catch(error => console.error('not pong -.-', error));

		if (!isScriptable(cw) && cw.document.URL !== 'about:blank') { console.log('skipping non-content tab', this); return; }

		if (webExtStarted == null) { // pause until the WebExtension is completely started
			console.log('pausing');
			const token = this.pauseRenderer();
			try {
				(yield getWebExtStarted);
			} catch (error) { throw error; } // TODO: user interaction
			this.resumeRenderer(token);
			console.log('resumed');
		}

		this.top = cw;
		this.utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		const ucw = Cu.waiveXrays(cw);

		ucw.getPageUtils = Cu.exportFunction(caller => {
			delete ucw.getPageUtils;
			return Cu.cloneInto(this.pageUtils, caller, { cloneFunctions: true, });
		}, ucw, { allowCrossOriginArguments: true, });

	}, { callSync: true, }),


	pauseRenderer() {
		if (this.pauseTokens.size === 0) {
			console.log('pausing now');
			this.utils.suppressEventHandling(true);
			this.utils.suspendTimeouts();
		}
		const token = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
		this.pauseTokens.add(token);
		// console.log('pausing', this.pauseTokens.size);
		return token;
	},
	resumeRenderer(token) {
		const removed = this.pauseTokens.delete(token);
		if (this.pauseTokens.size === 0) {
			console.log('resuming now');
			this.utils.suppressEventHandling(false);
			this.utils.resumeTimeouts();
		}
		// console.log('resuming', this.pauseTokens.size);
		return removed;
	},
});

function PageUtils(frame) {

	// ???: is utils.setCSSViewport() callable and useful?

	const api = ({
		pause: frame.pauseRenderer.bind(frame),
		resume: frame.resumeRenderer.bind(frame),
		onDOMWindowCreated: {
			addListener(func) {
				checkType(func, 'function');
				frame.onDOMWindowCreatedListeners.add(func);
			},
			removeListener(func) {
				return frame.onDOMWindowCreatedListeners.delete(func);
			}
		},
		loadSheet(cw, url) {
			const utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			utils.loadSheet(BrowserUtils.makeURI(url), utils.AGENT_SHEET);
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

function require(path) {
	const id = __resource + path.replace(/^\/?/, '/');
	try { Cu.unload(id); } catch (_) { }
	return Cu.import(id, { }).exports;
}
