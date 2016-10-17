'use strict'; /* globals Components, frames: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const prefix = 'stop-fingerprinting-content:';
const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ];

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
			Cu.unload('resource://stop-fingerprinting/webextension/content/process.jsm');
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
	needsReload && Cu.unload('resource://stop-fingerprinting/webextension/content/process.jsm');
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
		this.tabId = null;
		this.profile = null;
		this.top = null;
		this.utils = null;
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

	pauseWhile(promise) {
		console.log('pausing', this);
		this.utils.suppressEventHandling(true);
		this.utils.suspendTimeouts();

		resolved.then(() => promise).then(() => {
			console.log('resuming', this);
			this.utils.suppressEventHandling(false);
			this.utils.resumeTimeouts();
		});

		return promise;
	}

	handleCriticalError(error, message = (error && error.message || '') + '') {
		const resume = this.top.confirm(message.replace(/[!?.]$/, _=>_ || '.') +`\nResume navigation?`);
		if (resume) {
			console.error(message, error);
		} else {
			this.top.stop();
			this.top.document.documentElement && this.top.document.documentElement.remove();
			throw error;
		}
	}

	onDOMWindowCreated(event) {
		console.log('onDOMWindowCreated', event);

		const cw = event.target.defaultView;

		if (cw.top === cw) { // TODO: verify that this is true exactly iff cw is the tabs top level frame
			return this.topWindowCreated(cw);
		}

		this.injectInto(cw);
	}

	topWindowCreated(cw) {
		this.top = cw;
		this.utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

		if (!isScriptable(this.top.location.href)) { console.log('skipping non-content tab', this); return; }

		this.profile = null;
		if (this.tabId == null) {
			this.loadTabId().then(() => {
				this.loadProfile();
				this.injectInto(cw);
			}).catch(ErrorLogger);
		} else {
			this.loadProfile();
			this.injectInto(cw);
		}
	}

	loadTabId() { return this.pauseWhile(
		new Promise((resolve, reject) => {
			const ucw = Cu.waiveXrays(this.top);
			ucw.loadedTabId = Cu.cloneInto({ resolve, reject, }, ucw, { cloneFunctions: true, });
			setTimeout(reject, 1000, new Error('Timeout'));
		})
		.then(tabId => {
			console.log('got tabId', tabId);
			this.tabId = tabId;
		})
		.catch(error => this.handleCriticalError(parseError(error), `Failed to get the tab id`))
	); }

	loadProfile() {
		try {
			this.profile = this.request('getOptions', this.tabId);
		} catch (error) {
			this.handleCriticalError(parseError(error), `Failed to load the profile`);
		}
		console.log('got profile', this.profile);
	}

	injectInto(cw) {
		const ucw = Cu.waiveXrays(cw);
		if (!this.profile) { return; }

		ucw.profile = Cu.cloneInto(this.profile, ucw);

		const sandbox = Cu.Sandbox(ucw, {
			sameZoneAs: cw,
			sandboxPrototype: ucw,
			wantXrays: false,
		});

		Cu.evalInSandbox(`
			window.a1 = new window.Array;
			console.log('sandbox', this);
			console.log('window', window);
		`, sandbox);
	}

}

function parseError(string) {
	if (typeof string !== 'string' || !string.startsWith('$_ERROR_$')) { return string; }
	const object = JSON.parse(string.slice(9));
	const error = Object.create((object.name ? global[object.name] || Error : Error).prototype);
	Object.assign(error, object);
	return error;
}

function isScriptable(url) {
	if (url == null) { console.warn('isScriptable called with null url'); return false; }
	try {
		const _url = url +'';
		if (_url.length === 0) { console.warn('isScriptable called with empty url'); return false; }
		const nsIURI = BrowserUtils.makeURI(_url);
		return allUrls.matches(nsIURI) && !amoUrl.matches(nsIURI);
	} catch (error) {
		console.error('isScriptable ', url, ' threw', error);
		return false;
	}
}

function ErrorLogger(error) {
	console.error('uncaught (in Promise):', error);
	throw error;
}
