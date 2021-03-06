/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, require, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const self = require('sdk/self');
const { Cu, } = require('chrome');
Cu.import("resource://gre/modules/Services.jsm"); /* global Services */
const { ppmm: gppmm, mm: gfmm, } = Services;

const Port = require('./webextension/node_modules/es6lib/port.js');
const { moz_nsIMessageListenerManager, } = require('/content/port.js');

class ProcessScript {
	constructor({ process, frame, namespace, }) {
		// TODO: this works, but the caching issue of frame scrips is still open: https://bugzilla.mozilla.org/show_bug.cgi?id=1051238
		// maybe this behaviour changes when e10s is enabled
		// edit: it probably works because process.js and frame.js are basically one-liners that never change
		this.processSrc = self.data.url(`../${ process }`);
		this.frameSrc   = self.data.url(`../${ frame }`);
		gppmm.loadProcessScript(this.processSrc, true);
		gfmm.loadFrameScript(this.frameSrc, true);
		this.port = new Port({
			out: gppmm, in: [ gfmm, gppmm, ],
			namespace: self.id.replace(/@/g, '') +'-'+ namespace,
		}, moz_nsIMessageListenerManager);
		console.log('created ProcessScript', this);
	}

	destroy() {
		console.log('destroying ProcessScript', this);
		try { this.port.post('destroy'); } catch (_) { console.error(_); }
		gppmm.removeDelayedProcessScript(this.processSrc);
		gfmm.removeDelayedFrameScript(this.frameSrc, true);
		this.port.destroy();
	}
}

module.exports = ProcessScript;
