'use strict'; /* globals Components, frames: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ];
const prefix = 'stop-fingerprinting-content:';
const __dirname = 'resource://stop-fingerprinting/content';
const __fielname = __dirname +'/process.jsm';

const global = this;
const { classes: Cc, interfaces: Ci, utils: Cu, } = Components;
Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/Timer.jsm");
Cu.import("resource://gre/modules/MatchPattern.jsm"); /* global MatchPattern */
Cu.import("resource://gre/modules/BrowserUtils.jsm"); /* global BrowserUtils */
let cpmm = null, needsReload = false;
const frames = new Map;
const resolved = Promise.resolve();
const allUrls = new MatchPattern('<all_urls>');
const amoUrl  = new MatchPattern('https://addons.mozilla.org/*');

console.log('process.jsm loading', this);

const messageHandler = {
	destroy() {
		console.log('process script destroy');
		try { // try to unload, if it fails the process.js will unload the next it loads
			Cu.unload(__fielname);
		} catch (error) { needsReload = true; } // see https://bugzilla.mozilla.org/show_bug.cgi?id=1195689

		// remove all listeners and the MessageManager
		Object.keys(messageHandler).forEach(type => {
			cpmm.removeMessageListener(prefix + type, messageHandler[type]);
		});
		cpmm = null;

		// detach from all frames
		frames.forEach(_=>_.destroy());
		frames.clear();
	},
};
Object.keys(messageHandler).forEach(key => {
	const handler = messageHandler[key];
	messageHandler[key] = function() { try {
		handler.apply(this, arguments);
	} catch (error) {
		console.error(`precess "${ key }" handler threw`, error);
	} };
});

function init(_cpmm) {
	console.log('process script init', _cpmm);
	cpmm = _cpmm;
	Object.keys(messageHandler).forEach(type => {
		cpmm.addMessageListener(prefix + type, messageHandler[type]/*, true*/);
	});
}

function reload() { // this is called by process.js to ensure that it gets a fresh module
	needsReload && Cu.unload(__fielname);
}

function addFrame(cfmm) {
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

	request(name, ...args) {
		console.log('request (sync)', name, ...args);
		const result = this.cfmm.sendSyncMessage(prefix +'request', { name, args, });
		if (result.length !== 1) { throw new Error(`request was handled ${ result.length } times`); }
		if (result[0].threw) {
			throw parseError(result[0].error);
		}
		return result[0].value;
	}

	onDOMWindowCreated(event) {
		const cw = event.target.defaultView;

		if (cw.top === cw) { // TODO: verify that this is true exactly iff cw is the tabs top level frame
			return this.topWindowCreated(cw);
		}
	}

	topWindowCreated(cw) {
		console.log('topWindowCreated', cw);
		this.top = null;
		this.utils = null;

		if (!isScriptable(cw)) { console.log('skipping non-content tab', this); return; }

		this.top = cw;
		this.utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		const ucw = Cu.waiveXrays(cw);

		ucw.getPageUtils = Cu.exportFunction(caller => {
			delete ucw.getPageUtils;
			return PageUtils(this.cfmm, caller, this.top, this.utils);
		}, Cu.waiveXrays(cw), { allowCrossOriginArguments: true, });

	}
}

function PageUtils(cfmm, caller, top, utils) {

	// ???: is utils.setCSSViewport() callable and useful?

	const pausing = new Set;
	const onDOMWindowCreatedListeners = new Set;

	function onDOMWindowCreatedDispatcher(event) {
		const cw = event.target.defaultView;
		onDOMWindowCreatedListeners.forEach(listener => {
			try { listener(cw); }
			catch (error) { console.error('onDOMWindowCreated listener threw', error); }
		});
		// TODO: 'crawl' cw (opener, parent, top, ...) and notify this and other PageUtils (potentially in other processes ...) in some way
		// ???: is there any way that a window A can get a reference to an other windows B if there was no reference from B to A when B was created?
	}

	const api = ({
		pause() {
			if (pausing.size === 0) {
				console.log('pausing now');
				utils.suppressEventHandling(true);
				utils.suspendTimeouts();
			}
			const token = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
			pausing.add(token);
			// console.log('pausing', pausing.size);
			return token;
		},
		resume(token) {
			const removed = pausing.delete(token);
			if (pausing.size === 0) {
				console.log('resuming now');
				utils.suppressEventHandling(false);
				utils.resumeTimeouts();
			}
			// console.log('resuming', pausing.size);
			return removed;
		},
		onDOMWindowCreated: {
			addListener(func) {
				checkType(func, 'function');
				if (onDOMWindowCreatedListeners.size === 0) {
					cfmm.addEventListener('DOMWindowCreated', onDOMWindowCreatedDispatcher);
				}
				onDOMWindowCreatedListeners.add(func);
			},
			removeListener(func) {
				const removed = onDOMWindowCreatedListeners.delete(func);
				if (onDOMWindowCreatedListeners.size === 0) {
					cfmm.removeEventListener('DOMWindowCreated', onDOMWindowCreatedDispatcher);
				}
				return removed;
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
		if (typeof value !== type) { throw new caller.TypeError(`"${ name }" must be a ${ type } (?)`); }
	}

	return Cu.cloneInto(api, caller, { cloneFunctions: true, });
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
			debugger;
			console.log('unscriptable window', cw, url, cw.location, cw.opener);
			// TODO: after `window.open()` the new windows url is`'about:blank' (and thus unscriptable) but the `window.opener` is already set.
			// so this function should probably return isScriptable(cw.opener)
			// but TODO: test if this is the only case where `window.opener` is set
			debugger;
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
