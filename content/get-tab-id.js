(function() { 'use strict'; try { /* globals browser */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

// If the frame script detects the load of a scriptable top level page but doesn't know its own WebExtension tabId yet,
// it will set `ucw.loadedTabId` so that this script can ask the background page for its tabId and report it back to the frame script.
// This is done once per tab, and the frame script suspended the contents event loop while this request is pending.

const ucw = window.wrappedJSObject;
if (!ucw.loadedTabId) { return; }

const { resolve, reject, } = ucw.loadedTabId;
delete ucw.loadedTabId;

browser.runtime.sendMessage({ name: 'getSenderTabId', args: [ ], })
.then(reply => {
	if (reply.threw) { throw reply.error; }
	return reply.value;
})
.then(resolve, reject);

} catch (error) { console.error(error); } })();
