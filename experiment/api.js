const API = (function(global) { 'use strict'; // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
/* globals ExtensionAPI, Components */
const { classes: Cc, interfaces: Ci, utils: Cu, } = Components;
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
Cu.importGlobalProperties([ 'URL', ]); /* globals URL */
const { ppmm: gppmm, mm: gfmm, } = Services;

console.log('api.js', global);

class API extends ExtensionAPI {
	constructor(extension) {
		super(...arguments);
		// console.log('new API', this);

		// TODO: does Cu.getGlobalForObject(extension. ...) give access to the `TabManager` in https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/ext-utils.js#754 ?
	}

	getAPI(context) {
		console.log('getAPI', this, context);

		return { content: {
			start: this.start.bind(this, context),
		}, };
	}

	start({ contentWindow, }, options) {
		const script  = new ProcessScript(contentWindow, this.extension, options);
		const destroy = Cu.exportFunction(script.destroy, contentWindow, { allowCrossOriginArguments: true, });
		return destroy;
	}
}

class ProcessScript {
	constructor(cw, extension, { process, frame, namespace, handlers, }) {
		this.ucw = Cu.waiveXrays(cw);
		const id = extension.id.replace(/@/g, '');
		// TODO: this wotks, but the caching issue of frame scrips is still open: https://bugzilla.mozilla.org/show_bug.cgi?id=1051238
		// maybe this behaviour changes when e10s is enabled
		this.processSrc = `resource://${ id }/webextension${ new URL(process, cw.location).pathname }`;
		this.frameSrc   = `resource://${ id }/webextension${ new URL(frame, cw.location).pathname }`;
		this.prefix = id +'-'+ namespace +':';
		this.handlers = Object.assign({ }, Cu.waiveXrays(handlers));
		gppmm.loadProcessScript(this.processSrc, true);
		gfmm.loadFrameScript(this.frameSrc, true);
		this.onRequest = this.onRequest.bind(this);
		gfmm.addMessageListener(this.prefix +'request', this.onRequest);
		console.log('created ProcessScript', this);
		this.destroy = this.destroy.bind(this);
		this.destroyed = false;
	}

	destroy() {
		if (this.destroyed) { return; }
		this.destroyed = true;

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
					error instanceof this.sandbox.Error
					|| typeof error.constructor && error.constructor.name === 'string' && (/^[A-Z]\w+Error$/).test(error.constructor.name)
				)) {
					console.log('serializing error', error);
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

return API; })((function() { return this; })());
