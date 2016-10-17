(() => { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { async, sleep, spawn, },
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/chrome/': { Runtime: { sendNativeMessage, }, },
}) {

const connect = (ports) => new Promise((resolve, reject) => {
	let resolved = false, rejected = 0;
	// setTimeout(() => (resolved = true) && reject(new Error('Timeout')), 300);
	const sockets = ports.map(port => new WebSocket('wss://localhost:'+ port));
	sockets.forEach(socket => {
		socket.onerror = error => ++rejected >= ports.length && reject(error);
		socket.onopen = () => {
			if (resolved) { return; }
			sockets.filter(_=>_!==socket).forEach(_=>_.close());
			resolve(socket);
			resolved = true;
		};
	});
});

/**
 * Class that establishes the connection to a native app.
 * While the connection is open (between calls to `onStart` and `onStop`) it has a
 * @property {es6lib/Port}  port  Port for communication with the native app. @see https://github.com/NiklasGollenstede/es6lib/blob/master/port.js
 */
class NativeConnector {

	/**
	 * Creates a native connector.
	 * @param  {number}            options.version  The version of the native app to connect to.
	 * @param  {Array<number>}     options.ports    Array of port numbers the native app may be listening on when it runs.
	 * @param  {function}          options.onStart  A function that is called with `this` as the only argument whenever the connections is established.
	 * @param  {function}          options.onStop   A function that is called with `this` as the only argument whenever the connections is lost.
	 * @return {NativeConnector}                    The new NativeConnector instance.
	 */
	constructor({ version = 0, ports, onStart, onStop, }) {
		this.appName = 'stop_fingerprint_echo_server.v'+ version;
		this._ports = ports;
		this.onStart = onStart;
		this.onStop = onStop;
		this.socket = null;
	}

	/**
	 * Establishes the connection to the native app. Unless `force` is true, it first tries to connect to all ports.
	 * If this fails or `force` is true, it sends an empty message to the native app to start it, and then tries to connect on all ports again.
	 * Only one WebSocket connection is kept open, if multiple connections succeed, the others are closed again.
	 * Calls the onStart() callback.
	 * @param  {bool}     force  If true, the first attempt to connect to an existing app is skipped.
	 * @return {Promise}         Resolves/rejects once the connection succeeds/fails and the Promise returned by onStart resolves/rejects.
	 */
	start(force) { return spawn(function*() {
		if (this.port) { return; }
		try { !force && (this.socket = (yield connect(this._ports))); }
		catch (error) { force = true; }
		if (force) {
			console.log('starting server');
			sendNativeMessage(this.appName, { });
			(yield sleep(1000)); // TODO: this is obviously ugly, but waiting for sendNativeMessage() is not enough.
			// (yield sendNativeMessage(this.appName, { }).catch(_=>_));
			console.log('started server (or not)');
			this.socket = (yield connect(this._ports));
		}
		this.port = new Port(this.socket);
		this.socket.onclose = this.stop.bind(this);
		this.onStart && (yield this.onStart.call(this));
	}, this); }

	/**
	 * Closes the connection to the native app.
	 * Calls the onStop() callback.
	 * @return {any}         The return value of onStop().
	 */
	stop() {
		if (!this.port) { return; }
		this.socket.close();
		this.socket = this.port = null;
		return this.onStop && this.onStop.call(this);
	}

}

return NativeConnector;

}); })();
