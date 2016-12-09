'use strict'; /* globals exports, setTimeout: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const self = require('sdk/self');
const Prefs = require('sdk/simple-prefs');
const { setTimeout, } = require('sdk/timers');
const webExtension = require('sdk/webextension');

const { Services } = require('resource://gre/modules/Services.jsm');

const { _async, spawn, Resolvable, } = require('./webextension/node_modules/es6lib/concurrent.js');
const Port = require('./webextension/node_modules/es6lib/port.js');
const { sliceTabInto, replaceParentTab, } = require('./tab-utils.js');

const getBlobs = require('./load-blobs.js')(); // ==> object of files in /blob/ as { ...[path]: { url: 'blob:...', type: '...', }, }
const getWebExtId = new Resolvable; // ==> random (but constant) uuid of the WebExtension
let webExtPort = null; // es6lib/Port to communicate with the WebExtension

const tabIdToBrowser = new Map; // webExt tabId ==> xul <browser> // this association should never change, if it does (for relevant pages) these maps are insufficient
const browserToTabId = new Map; // xul <browser> ==> webExt tabId

// attach the frame/process scripts
const processScript = new (require('./attach.js'))({
	process:   'content/process.js', // could try to add the webExtId here and forward it to process.jsm to avoid the call to getWebExtId. This might introduce inconsistent behaviour, though
	frame:     'content/frame.js',
	namespace: 'content',
});

processScript.port.addHandlers({
	getWebExtId() { console.log('getWebExtId'); return getWebExtId; },
	getWebExtStarted() {
		console.log('getWebExtStarted');
		return Promise.all([ getBlobs, getWebExtStarted, ])
		.then((([ blobs, ]) => ({ blobs, })));
	},
	setTabId(tabId) {
		if (tabId == null) { throw new Error(`invalid tabId`); }
		// const tab = this.ownerGlobal.gBrowser && this.ownerGlobal.gBrowser.getTabForBrowser(this);
		tabIdToBrowser.set(tabId, this);
		browserToTabId.set(this, tabId);
	},
	getTabData(tabId, url) {
		if (browserToTabId.get(this) !== tabId) { console.error('xul <browser> <==> webExt tabId relation changed!'); }
		return webExtPort.request('getTabData', tabId, url);
	},
	resetOnCrossNavigation(tabId) {
		return webExtPort.request('resetOnCrossNavigation', tabId);
	},
});

const webExtHandlers = { // handlers for the actions specified in /background/sdk-connection.js
	getPref(name) {
		return Prefs.prefs[name];
	},
	resetTab(tabId, { userContextId, url, }) {
		const browser = tabIdToBrowser.get(tabId);
		const tab = browser.ownerGlobal.gBrowser && browser.ownerGlobal.gBrowser.getTabForBrowser(browser);
		if (!tab) { return false; }

		userContextId == null && (userContextId = tab.getAttribute('usercontextid') || '');
		const newTab = sliceTabInto(tab, userContextId, url);
		replaceParentTab(newTab); // TODO: this should be called once the navigation in newTab is committed, or newTab should be closed if it fails
		return true;
	},
};

const startWebExt = _async(function*() {

	// load the WebExtension
	let extension;
	try {
		extension = (yield webExtension.startup());
	} catch (error) {
		console.error(error);
		return 1;
	}

	try {
		const id = JSON.parse(Services.prefs.getCharPref('extensions.webextensions.uuids'))[self.id];
		console.log('id', id);
		if (!id) { return 4; }
		getWebExtId.resolve(id);
	} catch (_) { return 4; }

	// connect to the WebExtension
	let port;
	try {
		webExtPort = new Port((yield new Promise((resolve, reject) => {
			extension.browser.runtime.onConnect.addListener(port => {
				port.name === 'sdk' && resolve(port);
			});
			setTimeout(reject, 10000);
		})), Port.web_ext_Port);
	} catch (_) {
		return 2;
	}

	webExtPort.addHandlers(webExtHandlers);

	// wait for the WebExtension to start
	try {
		(yield webExtPort.request('awaitStarted'));
	} catch (error) {
		console.error(error);
		return 3;
	}

	return 0;
});

const getWebExtStarted = startWebExt()
.then(code => {
	// calling processScript.destroy(); here has very wiers effects (const variables in process.jsm are reset to undefined)
	switch (code) {
		case 0: {
			console.info('WebExtension started');
		} return;
		case 1: {
			throw new Error('Could not start, the WebExtension Experiment API is most likely missing');
		} break;
		case 2: {
			throw new Error('WebExtension startup timed out');
		} break;
		case 3: {
			throw new Error('WebExtension failed to start');
		} break;
		case 4: {
			throw new Error(`Failed to read the WebExtension's UUID`);
		} break;
		default: {
			throw new Error(`WebExtension failed with unknown error`);
		} break;
	}
	processScript.destroy();
})
.catch(error => {
	getWebExtId.reject(error);
	console.error('Startup failed', error);
	return null;
});


// respond to unload, unless its because of 'shutdown' (performance)
exports.onUnload = reason => {
	if (reason === 'shutdown') { return; }
	processScript.destroy();
};
