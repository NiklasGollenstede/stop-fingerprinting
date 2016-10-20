'use strict'; /* globals module, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const { Cc, Ci, Cu, } = require('chrome');
Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
const { ppmm: gppmm, mm: gfmm, } = Services;

class ProcessScript {
	constructor({ process, frame, namespace, handlers, }) {
		// TODO: this wotks, but the caching issue of frame scrips is still open: https://bugzilla.mozilla.org/show_bug.cgi?id=1051238
		// maybe this behaviour changes when e10s is enabled
		this.processSrc = `resource://stop-fingerprinting/${ process }`;
		this.frameSrc   = `resource://stop-fingerprinting/${ frame }`;
		this.prefix = 'stop-fingerprinting-'+ namespace +':';
		this.handlers = handlers;
		gppmm.loadProcessScript(this.processSrc, true);
		gfmm.loadFrameScript(this.frameSrc, true);
		this.onRequest = this.onRequest.bind(this);
		gfmm.addMessageListener(this.prefix +'request', this.onRequest);
		console.log('created ProcessScript', this);
	}

	destroy() {
		console.log('destroying ProcessScript', this);
		this.post('destroy');
		gppmm.removeDelayedProcessScript(this.processSrc);
		gfmm.removeDelayedFrameScript(this.frameSrc, true);
		gfmm.removeMessageListener(this.prefix +'request', this.onRequest);
	}

	onRequest({ data: { name, args, }, }) {
		console.log('onRequest', name, args);
		try {
			return {
				value: this.handlers[name](...args),
			};
		} catch (error) {
			console.error(`request "${ name }" handler threw`, error);
			try {
				if (error !== null && typeof error === 'object' && (
					error instanceof Error
					|| typeof error.constructor && error.constructor.name === 'string' && (/^(?:[A-Z]\w+)?Error$/).test(error.constructor.name)
				)) {
					// console.log('serializing error', error);
					error = '$_ERROR_$'+ JSON.stringify({ name: error.name, message: error.message, stack: error.stack, });
				}
			} catch (_) { }
			return { threw: true, error, };
		}
	}

	post(name, message) {
		gppmm.broadcastAsyncMessage(this.prefix + name, message);
	}
}

module.exports = ProcessScript;
