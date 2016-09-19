(() => { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { async, sleep, spawn, },
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/chrome/': { Tabs, Messages, Runtime: { sendNativeMessage, }, },
	'node_modules/web-ext-utils/utils': { showExtensionTab, },
	'common/utils': { notify, domainFromUrl, setBrowserAction, },
}) {

const connect = (ports) => new Promise((resolve, reject) => {
	let resolved = false, rejected = 0;
	// setTimeout(() => (resolved = true) && reject(new Error('Timeout')), 300);
	ports.forEach(port => {
		const socket = new WebSocket('wss://localhost:'+ port);
		socket.onerror = error => ++rejected >= ports.length && reject(error);
		socket.onopen = () => resolved ? socket.close() : ((resolved = true), resolve(socket));
	});
});

class Native {

	constructor({ version = 0, ports, onStart, onStop, }) {
		this.appName = 'stop_fingerprint_echo_server.v'+ version;
		this._ports = ports;
		this.onStart = onStart;
		this.onStop = onStop;
		this.socket = null;
	}

	start(force) { return spawn(function*() {
		if (this.port) { return; }
		try { !force && (this.socket = (yield connect(this._ports))); }
		catch (error) { force = true; }
		if (force) {
			console.log('starting server');
			sendNativeMessage(this.appName, { });
			(yield sleep(1000));
			// (yield sendNativeMessage(this.appName, { }).catch(_=>_));
			console.log('started server (or not)');
			this.socket = (yield connect(this._ports));
		}
		this.port = new Port(this.socket);
		this.socket.onclose = this.stop.bind(this);
		this.onStart && this.onStart.call(this);
	}, this); }

	stop() {
		if (!this.port) { return; }
		this.socket.close();
		this.socket = this.port = null;
		this.onStop && this.onStop.call(this);
	}

}

return Native;

}); })();
