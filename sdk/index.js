'use strict'; /* globals setTimeout: true, */

const { async, spawn, } = require('webextension/node_modules/es6lib/concurrent.js');
const Port = require('webextension/node_modules/es6lib/port.js');
const webExtension = require('sdk/webextension');
const { setTimeout, } = require('sdk/timers');
const Prefs = require('sdk/simple-prefs');

const webExtHandlers = { // handlers for the actions specified in /background/sdk-connection.js
	getPref(name) {
		return Prefs.prefs[name];
	},
};

const start = async(function*() {

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
			setTimeout(reject, 2000);
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

start()
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
			console.error('WebExtension failed with unknown error');
		}
	}
})
.catch(error => console.error('Startup failed', error));
