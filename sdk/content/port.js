(function(global) { 'use strict'; const factory = function es6lib_port_moz_nsIMessageListenerManager(exports) { // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

typeof console === 'undefined' && Components.utils.import("resource://gre/modules/Console.jsm"); /* global Components */

exports.moz_nsIMessageListenerManager = class moz_nsIMessageListenerManager {

	constructor(options, onData) {
		this.in = options.in || options.mm; if (!Array.isArray(this.in)) { this.in = [ this.in, ]; }
		this.out = options.out || options.mm;
		const name = this.name = options.name || options.namespace;
		this.broadcast = 'broadcast' in options ? options.broadcast : this.out && !this.out.sendAsyncMessage;
		this.sync = !!options.sync;
		this.onMessage = ({ sync, target, data, }) => {
			const sender = target.messageManager || target;
			let retVal;
			const reply = sync ? ((...args) => (retVal = args)) : ((...args) => sender.sendAsyncMessage(name, args));
			const async = onData(data[0], data[1], data[2], target, reply);
			if (sync && async) { try { console.error(new Error(`ignoring asynchronous reply to synchronous request`)); } catch (_) { } }
			return retVal;
		};
		this.in.forEach(_=>_.addMessageListener(this.name, this.onMessage));
	}

	send(name, id, args, options) { // eslint-disable-line consistent-return
		const sync = options && ('sync' in options) ? options.sync : this.sync;
		if (sync) {
			const replies = this.out.sendSyncMessage(this.name, [ name, id, args, ]).filter(Array.isArray);
			if (replies.length < 1) { throw new Error(`Request was not handled`); }
			if (replies.length > 1) { throw new Error(`Request was handled more than once`); }
			const retVal = handleReply(replies[0]);
			return retVal === undefined ? null : retVal;
		} else {
			const broadcast = options && ('broadcast' in options) ? options.broadcast : this.broadcast;
			if (broadcast && id) { throw new Error(`Can't broadcast request, use post() instead`); }
			const sender = options && options.sender;
			if (sender && id && !this.in.includes(sender)) { // listen to this reply
				const onReply = event => {
					if (!event.data || Math.abs(event.data[1]) !== id) { return; }
					sender.removeMessageListener(this.name, onReply);
					this.onMessage(event);
				};
				sender.addMessageListener(this.name, onReply);
			}
			(sender || this.out)[broadcast ? 'broadcastAsyncMessage' : 'sendAsyncMessage'](this.name, [ name, id, args, ]);
		}
	}

	destroy() {
		this.in.forEach(_=>_.removeMessageListener(this.name, this.onMessage));
	}
};

function handleReply(reply) {
	if (!Array.isArray(reply)) { throw new Error('Unhandled request'); }
	if (reply[1] < 0) {
		throw fromJson(reply[2][0]);
	} else {
		return reply[2][0];
	}
}

function fromJson(string) {
	if (typeof string !== 'string') { return string; }
	return JSON.parse(string, (key, value) => {
		if (!value || typeof value !== 'string' || !value.startsWith('$_ERROR_$')) { return value; }
		const object = JSON.parse(value.slice(9));
		const Constructor = typeof object.name === 'string' && typeof global[object.name] === 'function' ? global[object.name] : Error;
		const error = Object.create(Constructor.prototype);
		Object.assign(error, object);
		return error;
	});
}

}; if (typeof define === 'function' && define.amd) { define([ 'exports', ], factory); } else { const exp = { }, result = factory(exp) || exp; if (typeof exports === 'object' && typeof module === 'object') { module.exports = result; } else { global[factory.name] = result; if (typeof QueryInterface === 'function') { global.exports = result; global.EXPORTED_SYMBOLS = [ 'exports', ]; } } } })((function() { return this; })()); // eslint-disable-line
