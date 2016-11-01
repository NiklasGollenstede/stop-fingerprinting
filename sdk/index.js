'use strict'; /* globals exports, setTimeout: true, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const { _async, spawn, } = require('webextension/node_modules/es6lib/concurrent.js');
const Port = require('webextension/node_modules/es6lib/port.js');
const webExtension = require('sdk/webextension');
const { setTimeout, } = require('sdk/timers');
const Prefs = require('sdk/simple-prefs');

// attach the frame/process scripts
const processScript = new (require('./attach.js'))({
	process:   'content/process.js',
	frame:     'content/frame.js',
	namespace: 'content',
	handlers: {
	},
});

const webExtHandlers = { // handlers for the actions specified in /background/sdk-connection.js
	getPref(name) {
		return Prefs.prefs[name];
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

	// connect to the WebExtension
	let port;
	try {
		port = (yield new Promise((resolve, reject) => {
			extension.browser.runtime.onConnect.addListener(_port => {
				if (_port.name !== 'sdk') { return; }
				resolve(new Port(_port, Port.web_ext_Port));
			});
			setTimeout(reject, 10000);
		}));
	} catch (_) {
		return 2;
	}

	port.addHandlers(webExtHandlers);

	// wait for the WebExtension to start
	try {
		(yield port.request('start'));
	} catch (error) {
		console.error(error);
		return 3;
	}

	return 0;
});

startWebExt()
.then(code => {
	switch (code) {
		case 0: { // all good
			console.info('WebExtension started');
		} break;
		case 1: {
			console.error('Could not start, the WebExtension Experiment API is most likely missing');
		} break;
		case 2: {
			console.error('WebExtension startup timed out');
		} break;
		case 3: {
			console.error('WebExtension failed to start');
		} break;

		default: {
			console.error('WebExtension failed with unknown error:', code);
		}
	}
})
.catch(error => console.error('Startup failed', error));


// respond to unload, unless its because of 'shutdown' (performance)
exports.onUnload = reason => {
	if (reason === 'shutdown') { return; }
	processScript.destroy();
};
