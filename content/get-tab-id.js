(function(global) { 'use strict'; try { /* globals browser, */

if (document.readyState !== 'loading') { // the page already had a chance to load run code
	console.log('ignoring tab', global);
	browser.runtime.sendMessage([ 'ignoreTab', 0, [ ], ]); // TODO: implement handler for this
}

const ucw = window.wrappedJSObject;
if (!ucw.getTabId) { return; }

const { resolve, reject, } = ucw.getTabId;
delete ucw.getTabId;

browser.runtime.sendMessage([ 'getSenderTabId', Infinity, [ ], ])
.then(([ _, id, [ value, ], ]) => {
	if (id < 0) { throw new Error(`Failed to load tabId`); }
	return value;
})
.then(resolve, reject);

} catch (error) { console.error(error); } })((function() { /* jshint strict: false */ return this; })());
