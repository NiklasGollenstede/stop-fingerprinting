const API = (function(global) { 'use strict'; // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
/* globals ExtensionAPI, Components */
const { classes: Cc, interfaces: Ci, utils: Cu, } = Components;
Cu.import("resource://gre/modules/Console.jsm");

console.log('api.js', global);

// There is no way to run this in the content process (yet), so this does not work.

class API extends ExtensionAPI {
	constructor(extension) {
		super(...arguments);
		console.log('new API', this);
	}

	getAPI(context) {
		console.log('getAPI', this, context);

		return { renderer: {
			pauseWhile() {
				console.log('pauseWhile', this, context, ...arguments);

				// http://stackoverflow.com/questions/28484107/block-script-execution-in-firefox-extension
				// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIDOMWindowUtils

				// utils = Services.wm.getMostRecentWindow('navigator:browser').QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);

				return "Hello, world!";
			},
		}, };
	}
}

return API; })((function() { return this; })());
