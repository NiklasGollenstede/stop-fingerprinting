/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals require, exports, setTimeout: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const self = require('sdk/self');
const Prefs = require('sdk/simple-prefs');
const { setTimeout, } = require('sdk/timers');
const webExtension = require('sdk/webextension');

const { Services, } = require('resource://gre/modules/Services.jsm');

const { Resolvable, } = require('./webextension/node_modules/es6lib/concurrent.js');
const Port = require('./webextension/node_modules/es6lib/port.js');
const { sliceTabInto, replaceParentTab, } = require('./tab-utils.js');

const getWebExtId = new Resolvable;
let webExtPort = null;

const tabIdToBrowser = new Map; // webExt tabId ==> xul <browser> // this association should never change, if it does (for relevant pages) these maps are insufficient
const browserToTabId = new Map; // xul <browser> ==> webExt tabId

// attach the frame/process scripts
const processScript = new (require('./attach.js'))({
	process:   'content/process.js', // could try to add the webExtId here and forward it to process.jsm to avoid the call to getWebExtId. This might introduce inconsistent behaviour, though
	frame:     'content/frame.js',
	namespace: 'content',
});

// ???: delete 'extensions.webextensions.uuids' to generate new uuids for all WebExtensions?

processScript.port.addHandlers({
	getWebExtId() { console.log('getWebExtId'); return getWebExtId; },
	'await webExtStarted'() { console.log('getWebExtStarted'); return getWebExtStarted; },
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

async function startWebExt() {

	// load the WebExtension
	let extension;
	try {
		extension = (await webExtension.startup());
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
	try {
		webExtPort = new Port((await new Promise((resolve, reject) => {
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
		(await webExtPort.request('awaitStarted'));
	} catch (error) {
		console.error(error);
		return 3;
	}

	return 0;
}

const getWebExtStarted = startWebExt()
.then(code => {
	// calling processScript.destroy(); here has very wiers effects (const variables in process.jsm are reset to undefined)
	let error;
	switch (code) {
		case 0: {
			console.info('WebExtension started');
		} return;
		case 1: {
			error = new Error('Could not start, the WebExtension Experiment API is most likely missing');
		} break;
		case 2: {
			error = new Error('WebExtension startup timed out');
		} break;
		case 3: {
			error = new Error('WebExtension failed to start');
		} break;
		case 4: {
			error = new Error(`Failed to read the WebExtension's UUID`);
		} break;
		default: {
			error = new Error(`WebExtension failed with unknown error`);
		} break;
	}
	processScript.destroy();
	throw error || new Error;
})
.catch(error => {
	getWebExtId.reject(error);
	console.error('Startup failed', error);
	return null;
});

void restart; function restart() {
	const { Ci, Cc, } = require('chrome');
	const service = Ci.nsIAppStartup;
	Cc['@mozilla.org/toolkit/app-startup;1'].getService(service)
	.quit(service.eRestart); // | service.eForceQuit
}

// respond to unload, unless its because of 'shutdown' (performance)
exports.onUnload = reason => {
	if (reason === 'shutdown') { return; }
	processScript.destroy();
};
