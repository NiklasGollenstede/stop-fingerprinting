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
Cu.import("resource://gre/modules/Timer.jsm"); /* globals setTimeout, */
Cu.import("resource://gre/modules/MatchPattern.jsm"); /* global MatchPattern */
Cu.import("resource://gre/modules/BrowserUtils.jsm"); /* global BrowserUtils */
Cu.importGlobalProperties([ 'URL', 'Blob', ]); /* globals URL, Blob, */

const Port = require('webextension/node_modules/es6lib/port.js');
const { _async, spawn, sleep, asyncClass, Resolvable, } = require('webextension/node_modules/es6lib/concurrent.js');

const files = require('webextension/content/files.jsm');

let port = null, needsReload = false, blobs = null;
const getWebExtId = new Resolvable; let webExtOrigin = null;
const getWebExtStarted = new Resolvable; let webExtStarted = false;
const frames = new Map;
const resolved = Promise.resolve();

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
	})
	.then(() => port.request('getWebExtStarted'))
	.then(data => {
		blobs = data.blobs;
		webExtStarted = true;
		getWebExtStarted.resolve();
		console.log('starting process.jsm', data);
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
		this.top = null; // the top level window
		this.utils = null; // nsIDOMWindowUtils of .top
		this.tabData = null;
		this.tabId = null; // requested once a isScriptableWindow() is loaded
		this.pauseTokens = new Set; // used by this.pageUtils. cleared on topWindowCreated
		this.isScriptable = false; // isScriptableWindow(this.top)
		this.handleCriticalError = this.handleCriticalError.bind(this);
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

	handleCriticalError(options, error) {
		const { message, rethrow, } = options;
		error = 'stack' in options ? options : options.error || error;
		const resume = this.top
		? this.top.confirm(message.replace(/[!?.]?$/, _=>_ || '.') +`\nResume navigation?`)
		: true; // can't pause anyway
		if (!resume) {
			this.pauseRenderer(); // discard token
			this.top.stop();
			this.top.document.documentElement && this.top.document.documentElement.remove();
			if (rethrow) { throw error; }
		}
		console.error(message, error);
		return resume;
	},

	onDOMWindowCreated: _async(function*(event) { try {
		console.log('onDOMWindowCreated', event);
		const cw = event.target.defaultView;

		if (cw.top === cw) { // TODO: verify that this is true exactly iff cw is the tabs top level frame
			this.topWindowCreated(cw);
		}

		if (!webExtOrigin && cw.location.protocol === 'moz-extension:') {
			(yield this.pauseWhile(getWebExtId)); // pause until the WebExtension is started far enough to know it's id
		} // webExtOrigin is not null anymore

		if (webExtOrigin && cw.location.origin === webExtOrigin) {
			extendWebExtWindow(cw);
		}

		if (!this.isScriptable) { console.log('skipping non-content tab', this); return; }

		if (cw.top === cw) {
			if (!webExtStarted) { // pause until the WebExtension is completely started
				(yield this.pauseWhile(getWebExtStarted));
			}
			if (this.tabId == null) {
				const ucw = Cu.waiveXrays(cw);
				const getTabId = new Promise((resolve, reject) => {
					ucw.getTabId = Cu.cloneInto({ resolve, reject, }, ucw, { cloneFunctions: true, });
				});
				this.tabId = (yield this.pauseWhile(getTabId));
				console.log('got tabId', this.tabId);
				port.post({ sender: this.cfmm, }, 'setTabId', this.tabId);
			}
		}

		if (cw.top === cw) {
			this.tabData = (yield this.pauseWhile(port.request({ sender: this.cfmm, }, 'getTabData', this.tabId, this.top.location.href)));
			if (this.tabData == null) { console.log('tabData is null'); } // no tabData available for this tab yet. This is not an error
		}

		if (this.tabData != null) {
			this.injectInto(cw);
		}
	} catch (error) {
		this.handleCriticalError({ message: `Failed to wrap window: ${ error && error.message }`, error, });
	} }, { callSync: true, }),

	topWindowCreated(cw) { // the WebExtension may not be loaded yet
		console.log('topWindowCreated', cw);

		// remove the previous window and all related resources
		this.webExtPort = this.tabData = null;
		this.pauseTokens.size && console.warn('replaced page was paused');
		this.pauseTokens.clear();
		this.top = cw;
		this.utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

		this.isScriptable = isScriptableWindow(cw);
		this.isScriptable && cw.addEventListener('unload', () => { /* disable BFcache */ }); // worry about the performance hit later: https://developer.mozilla.org/en-US/docs/Working_with_BFCache
	},

	injectInto(cw) {
		const ucw = Cu.waiveXrays(cw);
		const {
			profile,
			changed: profileChanged, // whether this profile is a different one than on the last page load
			pageLoadCount, // number of pages loaded in this tab, starting ta 1
			includes: includeRegExpSource, // RegExp of (url.origin || url.href) that share their origin with the current page
		} = this.tabData;
		if (!profile || profile.disabled) { console.log('profile is disabled'); return; } // never mind ...

		console.log('got profile', profile.nonce, this.tabData);
		const includeRegExp = new RegExp(includeRegExpSource);

		const sandbox = Cu.Sandbox(ucw, {
			sameZoneAs: ucw,
			sandboxPrototype: ucw,
			wantXrays: false,
		});

		const exportFunction = func => Cu.exportFunction(func, ucw, { allowCrossOriginArguments: true, });
		const cloneInto = obj => Cu.cloneInto(obj, ucw, { cloneFunctions: false, }); // expose functions only explicitly through exportFunction
		const needsCloning = obj => obj !== null && typeof obj === 'object' && Cu.getGlobalForObject(obj) !== ucw; // TODO: test
		const originIncludes = url => (url = new URL(url, cw.location)) && url.origin === 'null' ? includeRegExp.test(url.href) : includeRegExp.test(url.origin);
		const postToBackground = (name, ...args) => port.post({ sender: this.cfmm, }, name, this.tabId, ...args);

		sandbox.console = cw.console;
		sandbox.handleCriticalError = exportFunction(this.handleCriticalError.bind(this));
		sandbox.profile = cloneInto(profile);
		sandbox.isMainFrame = cw.top === cw;
		sandbox.profileChanged = profileChanged;
		sandbox.pageLoadCount = pageLoadCount;
		sandbox.exportFunction = exportFunction(exportFunction);
		sandbox.cloneInto = exportFunction(cloneInto);
		sandbox.needsCloning = exportFunction(needsCloning);
		sandbox.originIncludes = exportFunction(originIncludes);
		sandbox.postToBackground = exportFunction(postToBackground);
		sandbox.sandbox = sandbox;
		sandbox.ucw = ucw;

		const exec = ({ content, name, offset, }) => Cu.evalInSandbox(
			content, sandbox, 'latest',
			__dirname +'/'+ name +'?'+ (profile.debug ? 'abcdef' : profile.nonce), // the nonce is needed to create unpredictable error stack fames that can be filtered
			offset + 1
		);

		exec(files['globals.js']);
		Object.keys(files.fake).forEach(key => exec(files.fake[key]));
		exec(files['apply.js']);

		// TODO: there are cases (the first load in a new using Crl+Click) where the direct window. properties
		// are overwritten/not applied, but those on other objects (e.g. Screen.prototype) work

		if (profile.debug) { // TODO: remove
			ucw.profile = cloneInto(profile);
			ucw.apis = sandbox.apis;
		}
		console.log('loading fonts ...');
		return this.pauseWhile(this.injectCSS(cw))
		.then(() => cw.console.log('injection done', profile.debug, this.tabId));
	},

	injectCSS(cw) {
		const { document, } = cw;
		const span = document.documentElement.appendChild(document.createElement('span'));
		span.textContent = 'The quick brown fox jumps over the lazy dog';
		const before = span.offsetWidth;

		const CSS = URL.createObjectURL(new Blob([ (`
			@font-face {
				font-family: 'Bell MT';
				font-style: normal;
				font-weight: 400;
				src: url('${ blobs['fonts/Bell_MT/nn.woff2'].url }') format('woff2');
			}
		`), ]));

		this.loadSheet(cw, CSS);

		span.style.fontFamily = 'Bell MT';
		// if (before !== span.offsetWidth) { return; }

		return document.fonts.load('10px "Bell MT"').catch(error => { console.error('Error', error.stack || error); throw error; });
	},

	pauseWhile(promise) {
		// console.log('pausing', this); console.trace();
		const token = this.pauseRenderer();
		return promise
		.then(value => {
			this.resumeRenderer(token);
			// console.log('resumed');
			return value;
		});
	},

	pauseRenderer() {
		// if (!this.utils) { return 0; }
		if (this.pauseTokens.size === 0) {
			console.log('pausing now');
			this.utils.enterModalState();
			this.utils.suppressEventHandling(true);
			this.utils.suspendTimeouts();
		}
		const token = Math.round(Math.random() * (Number.MAX_SAFE_INTEGER - 1)) + 1;
		this.pauseTokens.add(token);
		// console.log('pausing', this.pauseTokens.size);
		return token;
	},
	resumeRenderer(token) {
		const removed = this.pauseTokens.delete(token);
		if (removed && this.pauseTokens.size === 0) {
			console.log('resuming now');
			this.utils.leaveModalState();
			this.utils.suppressEventHandling(false);
			this.utils.resumeTimeouts();
		}
		// console.log('resuming', this.pauseTokens.size);
		return removed;
	},

	loadSheet(cw, url) {
		const utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		utils.loadSheet(BrowserUtils.makeURI(url), utils.AGENT_SHEET);
	},
});

	// ???: is utils.setCSSViewport() callable and useful?

function extendWebExtWindow(cw) {
	const ucw = Cu.waiveXrays(cw);
	ucw./*browser.tabs.*/isScriptable = Cu.exportFunction(function(url) {
		try {
			return isScriptableUrl(url);
		} catch (error) {
			console.error('isScriptable ', url, ' threw', error);
			return false;
		}
	}, ucw, { allowCrossOriginArguments: true, });
}

const allUrls = new MatchPattern('<all_urls>');
const amoUrl  = new MatchPattern('https://addons.mozilla.org/*');
function isScriptableWindow(cw) {
	try {
		if (cw.document.readyState === 'uninitialized') { // this can happen directly after a tab was opened using Ctrl+click.
			// The document.URL is 'about:blank' at this point and changes later (or the document is replaced), but the window is already the one used by the content
			console.log('cw.document is uninitialized', cw.document, 'assuming', !!cw.document.domain);
			return !!cw.document.domain && cw.document.domain !== 'addons.mozilla.org'; // is only set for actual domains (and not about:/chrome:/...) TODO: assert that this is true
		}
		const url = cw.document.URL;
		if (url == null) { console.warn('isScriptable called with null url'); return false; }
		if (url.length === 0) { console.warn('isScriptable called with empty url'); return false; }

		if (isScriptableUrl(url)) {
			return true;
		} else {
			console.log('unscriptable window', cw, url, cw.location, cw.opener);
			return false;
		}
		// it might be worth a bug report that causing a reference error here (window) crashes the entire browser (and prevents it from starting)
	} catch (error) {
		console.error('isScriptable ', cw, ' threw', error);
		return false;
	}
}

function isScriptableUrl(url) {
	const nsIURI = BrowserUtils.makeURI(url);
	return allUrls.matches(nsIURI) && !amoUrl.matches(nsIURI) && !url.startsWith('moz-extension://');
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

// TODO: the font url should be blob:
const CSS = URL.createObjectURL(new Blob([ (`
	@font-face {
		font-family: 'Bell MT';
		/*font-family: 'Impact';*/
		font-style: normal;
		font-weight: 400;
		src: url(data:application/application/font-woff2;base64,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) format('woff2');
	}
	/*@font-face {
		font-family: 'Alias';
		src: local('Impact');
	}*/
`), ]));

const FontLoader = {
	fonts: [
		{ family: '??????', name: '"bell MT"', path: 'Bell_MT/nn.woff2', url: '', type: '', },
	],


	loaded: false,
	load(blobs) {
		this.fonts.forEach(font => {
			const blob = blobs['fonts/'+ font.path];
			font.url = blob.url; font.type = blob.type;
		});
		const

	},
};
