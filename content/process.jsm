'use strict'; /* globals Components, frames: true, */
const prefix = 'stop-fingerprinting-content:';
const EXPORTED_SYMBOLS = [ 'init', 'reload', 'addFrame', ];

const global = this;
const { classes: Cc, interfaces: Ci, utils: Cu, } = Components;
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/Timer.jsm");
let cpmm = null, needsReload = false;
const frames = new Map;

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
		this._tabId = null;
		this.profile = null;
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
		console.log('frame event', event);
		return this['on'+ event.type](event);
	}

	get tabId() {
		if (this._tabId == null) {
			this._tabId = this.request('getNavigatingTab');
		}
		return this._tabId;
	}

	request(name, ...args) {
		console.log('request (sync)', name, ...args);
		const result = this.cfmm.sendSyncMessage(prefix +'request', { name, args, });
		if (result.length !== 1) { throw new Error(`request was handled ${ result.length } times`); }
		if (result[0].threw) {
			throw result[0].error;
		}
		return result[0].value;
	}

	onDOMWindowCreated(event) {
		console.log('onDOMWindowCreated', event);

		const cw = event.target.defaultView;
		const ucw = Cu.waiveXrays(event.target).defaultView;
		console.log('content window', cw);
		console.log('unsafe content window', ucw);

		if (cw.top === cw) { this.profile = null; } // TODO: verify that this is only true for top level frames
		if (this.profile == null) { try {
			this.profile = this.request('getOptions', this.tabId);
		} catch (error) {
			console.error(`Failed to load profile`, error);
			cw.stop();
			cw.document.documentElement && cw.document.documentElement.remove();
			return; // TODO: retry after x
		} }

		console.log('got profile', this.profile);

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
