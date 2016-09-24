'use strict'; /* globals module */

/// must export a function that is called once and returns an object of { onRequest, onConnect, onDisconnect, onBeforeExit, }
module.exports = class Handler {
	/// ctx os an object of { portNumber, permanent, startedByBrowser, folder, isBinary, args, }
	constructor(ctx) {
		this.ctx = ctx;
		console.log(`Https server listening on ${ ctx.portNumber }`);
	}
	/// called for https requests to portNumber
	onRequest(request, reply) {
		console.log('bouncing', request.headers['x-nonce']);
		reply.end(request.headers['x-nonce'] +';'+ request.headers['x-options']);
	}
	/// called whenever a client connects, port is a es6lib/Port
	onConnect(port) {
		console.log('port connected');
		port.addHandlers([ // remote handlers
			this.getPort,
		], this);
	}
	/// called whenever a client disconnects
	onDisconnect(oldPort) {
		console.log('port disconnected');
	}
	/// called shortly after the last client disconnected and the app is about to shut down. Return (a Promise to) false to prevent the shutdown
	onBeforeExit() {
		console.log('All ports disconnected, shutting down now');
		return Promise.resolve(!this.ctx.permanent);
	}

	// remote handlers

	getPort() {
		return this.ctx.portNumber;
	}
};
