(function(global) { 'use strict'; try { /* globals browser, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

if (global.document.readyState !== 'loading') { // the page already had a chance to load run code
	console.log('ignoring tab', global);
	browser.runtime.sendMessage([ 'ignoreTab', 0, [ ], ]); // TODO: implement handler for this
}

const ucw = global.window.wrappedJSObject;
if (!ucw.getTabId) { return; }

const { resolve, reject, } = ucw.getTabId;
delete ucw.getTabId;

browser.runtime.sendMessage([ 'getSenderTabId', 1, [ ], ])
.then(([ _, id, [ value, ], ]) => {
	if (id <<0 !== id) { throw new Error(`Failed to load tabId`); }
	return value;
})
.then(resolve, reject);

} catch (error) { console.error(error); } })(this);
