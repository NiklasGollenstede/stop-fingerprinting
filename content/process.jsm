'use strict'; /* globals Components, frames: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ];
const prefix = 'stop-fingerprinting-content:';
const __dirname = 'resource://stop-fingerprinting/webextension/content';
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

try { Cu.unload(__dirname +'/files.jsm', { }); } catch (_) { }
const { files, } = Cu.import(__dirname+ '/files.jsm', { });

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
		this.tabId = null; // the WebExtension tabId of this frame
		this.profile = null; // the profile of the top level page, if any
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

	handleCriticalError(error, message, rethrow) {
		message || (message = (error && error.message || '') + '');
		const resume = this.top.confirm(message.replace(/[!?.]$/, _=>_ || '.') +`\nResume navigation?`);
		if (resume) {
			this.top.stop();
			this.utils.suppressEventHandling(true);
			this.utils.suspendTimeouts();
			this.top.document.documentElement && this.top.document.documentElement.remove();
			if (rethrow) { throw error; }
		}
		console.error(message, error);
		return resume;
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

		if (!isScriptable(this.top)) { console.log('skipping non-content tab', this); return; }

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
		.catch(error => this.handleCriticalError(parseError(error), `Failed to get the tab id`, true))
	); }

	loadProfile() {
		try {
			this.profile = this.request('getOptions', this.tabId);
		} catch (error) {
			this.handleCriticalError(parseError(error), `Failed to load the profile`);
		}
		console.log('got profile', this.profile);
	}

	injectInto(cw) { try {
		const ucw = Cu.waiveXrays(cw);
		if (!this.profile) { return; }

		const sandbox = cw.sandbox = Cu.Sandbox(ucw, {
			sameZoneAs: ucw,
			sandboxPrototype: ucw,
			wantXrays: false,
		});

		const exportFunction = func => Cu.exportFunction(func, ucw, { allowCrossOriginArguments: true, });
		const cloneInto = obj => Cu.cloneInto(obj, ucw, { cloneFunctions: false, }); // expose functions only explicitly through exportFunction
		const needsCloning = obj => obj !== null && typeof obj === 'object' && Cu.getGlobalForObject(obj) !== ucw; // TODO: test

		sandbox.console = Cu.cloneInto(console, ucw, { cloneFunctions: true, });
		sandbox.handleCriticalError = exportFunction(this.handleCriticalError.bind(this));
		sandbox.profile = Cu.cloneInto(this.profile, ucw);
		sandbox.isMainFrame = cw === this.top;
		sandbox.exportFunction = exportFunction(exportFunction);
		sandbox.cloneInto = exportFunction(cloneInto);
		sandbox.needsCloning = exportFunction(needsCloning);
		sandbox.sandbox = sandbox;
		sandbox.ucw = ucw;

		const exec = ({ content, name, offset, }) => Cu.evalInSandbox(
			content, sandbox, 'latest',
			__dirname +'/'+ name +'?'+ this.profile.nonce, // the nonce is needed to create unpredictable error stack fames that can be filtered
			offset + 1
		);
/*
		Cu.evalInSandbox(`
			const x = 42;
			window.a1 = new window.Array;
			devicePixelRatio = 2;
		`, sandbox);
		Cu.evalInSandbox(`
			window.y = x;
		`, sandbox);
*/
		exec(files['globals.js']);
		Object.keys(files.fake).forEach(key => exec(files.fake[key]));
		exec(files['apply.js']);

		ucw.profile = Cu.cloneInto(this.profile, ucw); // TODO: remove
		console.log('injection done');
	} catch (error) {
		this.handleCriticalError(error, `Failed to inject code`);
	} }

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
		return allUrls.matches(nsIURI) && !amoUrl.matches(nsIURI);
	} catch (error) {
		console.error('isScriptable ', cw, ' threw', error);
		return false;
	}
}

function ErrorLogger(error) {
	console.error('uncaught (in Promise):', error);
	throw error;
}
