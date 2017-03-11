/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals Components, frames: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const global = this; // eslint-disable-line no-invalid-this

const namespace = 'stop-fingerprinting-content';
const __resource = 'resource://stop-fingerprinting';
const __dirname = __resource +'/content';
const __fielname = __dirname +'/process.jsm'; // which is __URL__

const { /*classes: Cc,*/ interfaces: Ci, utils: Cu, } = Components;
// Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
Cu.import("resource://gre/modules/Console.jsm");
// Cu.import("resource://gre/modules/Timer.jsm"); /* globals setTimeout, */
Cu.import("resource://gre/modules/MatchPattern.jsm"); /* global MatchPattern */
Cu.import("resource://gre/modules/BrowserUtils.jsm"); /* global BrowserUtils */
Cu.importGlobalProperties([ 'URL', 'Blob', ]); /* globals URL, Blob, */

const Port = require('webextension/node_modules/es6lib/port.js');
const { moz_nsIMessageListenerManager, } = require('/content/port.js');
const { Resolvable, } = require('webextension/node_modules/es6lib/concurrent.js');

const files = require('webextension/content/files.jsm');

let port = null, needsReload = false;
const getWebExtId = new Resolvable; let webExtOrigin = null;
const getWebExtStarted = new Resolvable; let webExtStarted = false;
const frames = new Map;
// const resolved = Promise.resolve();

console.log('process.jsm loading', global);

const messageHandlers = {
	destroy() {
		console.log('process script destroy');
		try { Cu.unload(__fielname); } // try to unload, if it fails the process.js will unload the next it loads
		catch (error) { needsReload = true; } // see https://bugzilla.mozilla.org/show_bug.cgi?id=1195689

		// remove all listeners
		port.destroy(); port = null;

		// detach from all frames
		frames.forEach(_=>_.destroy());
		frames.clear();
	},
};

async function init(cpmm) { try { // called once per process by ./process.js directly after (re-)loading this module
	console.log('process script init', ...arguments);
	port = new Port({
		in: cpmm, out: cpmm,
		namespace,
	}, moz_nsIMessageListenerManager);
	port.addHandlers(messageHandlers);

	const webExtId = (await port.request('getWebExtId'));
	webExtOrigin = 'moz-extension://'+ webExtId;
	getWebExtId.resolve();
	console.log('got webExtId', webExtId);

	(await port.request('await webExtStarted'));
	webExtStarted = true;
	getWebExtStarted.resolve();
	console.log('starting process.jsm');

} catch(error) { getWebExtId.reject(error); getWebExtStarted.reject(error); console.error(error); } }

function reload() { // this is called by ./process.js to ensure that it gets a fresh module
	needsReload && Cu.unload(__fielname);
}

function addFrame(cfmm) { // called by ./frame.js for every frame it is loaded in
	new Frame(cfmm);
}


class Frame { // represents a frame script, i.e. e.g. a tab (across navigations) not an iframe or a singe `window`
	constructor(cfmm) {
		if (frames.has(cfmm)) { throw new Error('duplicate frame'); }
		frames.set(cfmm, this);
		this.cfmm = cfmm;
		this.cfmm.addEventListener('DOMWindowCreated', this);
		this.cfmm.addEventListener('unload', this);
		this.top = null; // the top level `window`
		this.utils = null; // nsIDOMWindowUtils of .top
		this.tabData = null;
		this.tabId = null; // requested once a isScriptableWindow() is loaded
		this.pauseTokens = new Set; // used by this.pageUtils. cleared on topWindowCreated
		this.isScriptable = false; // isScriptableWindow(this.top)
		this.handleCriticalError = this.handleCriticalError.bind(this);
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
		try { return this['on'+ event.type](event); }
		catch (error) { console.error('on'+ event.type +' threw', error); }
		return null;
	}

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
	}

	async onDOMWindowCreated(event) { try {
		console.log('onDOMWindowCreated', event);
		const cw = event.target.defaultView;

		if (cw.top === cw) { // TODO: verify that this is true exactly iff cw is the tabs top level frame
			this.topWindowCreated(cw);
		}

		if (!webExtOrigin && cw.location.protocol === 'moz-extension:') {
			(await this.pauseWhile(getWebExtId)); // pause until the WebExtension is started far enough to know it's id
		} // webExtOrigin is not null anymore
		if (webExtOrigin && cw.location.origin === webExtOrigin) {
			extendWebExtWindow(cw);
		}

		if (!this.isScriptable) { console.log('skipping non-content tab', this); return; }

		if (cw.top === cw) {
			if (!webExtStarted) {
				(await this.pauseWhile(getWebExtStarted));
			}
			if (this.tabId == null) {
				const ucw = Cu.waiveXrays(cw);
				const getTabId = new Promise((resolve, reject) => {
					ucw.getTabId = Cu.cloneInto({ resolve, reject, }, ucw, { cloneFunctions: true, });
				});
				this.tabId = (await this.pauseWhile(getTabId));
				console.log('got tabId', this.tabId);
				port.post({ sender: this.cfmm, }, 'setTabId', this.tabId); // inform the SDK background about the tabId
			}

			this.tabData = (await this.pauseWhile(port.request({ sender: this.cfmm, }, 'getTabData', this.tabId, this.top.location.href)));
			if (this.tabData == null) { console.log('tabData is null'); } // no tabData available for this tab yet. This is not an error
		}

		if (this.tabData != null) {
			this.injectInto(cw);
		}
	} catch (error) {
		this.handleCriticalError({ message: `Failed to wrap window: ${ error && error.message }`, error, });
	} }

	topWindowCreated(cw) { // the WebExtension may not be loaded yet
		console.log('topWindowCreated', cw);

		// remove the previous window and all related resources
		this.tabData = null;
		this.pauseTokens.size && console.warn('replaced page was paused');
		this.pauseTokens.clear();
		this.top = cw;
		this.utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

		this.isScriptable = isScriptableWindow(cw);
		this.isScriptable && cw.addEventListener('unload', () => { /* disable BFcache */ }); // worry about the performance hit later: https://developer.mozilla.org/en-US/docs/Working_with_BFCache
	}

	injectInto(cw) {
		const ucw = Cu.waiveXrays(cw);
		const {
			profile,
			changed: profileChanged, // whether this profile is a different one than on the last page load
			pageLoadCount, // number of pages loaded in this tab, starting at 1
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

		// TODO: there are cases (the first load in a new tab using Crl+Click) where the direct window. properties
		// are overwritten/not applied, but those on other objects (e.g. Screen.prototype) work

		if (profile.debug) { // TODO: remove
			ucw.profile = cloneInto(profile);
			ucw.apis = sandbox.apis;
		}
		cw.console.log('injection done', profile.debug, this.tabId);
	}

	pauseWhile(promise) {
		// console.log('pausing', this); console.trace();
		const token = this.pauseRenderer();
		return promise
		.then(value => {
			this.resumeRenderer(token);
			// console.log('resumed');
			return value;
		});
	}

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
	}
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
	}

	loadSheet(cw, url) {
		const utils = cw.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		utils.loadSheet(BrowserUtils.makeURI(url), utils.AGENT_SHEET);
	}
}

	// ???: is utils.setCSSViewport() callable and useful?

function extendWebExtWindow(cw) {
	const ucw = Cu.waiveXrays(cw);
	ucw./*browser.tabs.*/isScriptable = Cu.exportFunction(url => {
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

const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ]; void EXPORTED_SYMBOLS; void init; void reload; void addFrame;
