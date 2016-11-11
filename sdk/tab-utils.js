'use strict'; /* globals exports, */

const { Cc,  Ci, Cu, } = require('chrome');
const gSessionStore = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
Cu.import('resource://gre/modules/ContextualIdentityService.jsm'); /* global ContextualIdentityService */
Cu.import('resource:///modules/sessionstore/TabState.jsm'); /* global TabState */

const parentTab = new WeakMap;
	// if (!+userContextId) { userContextId = ContextualIdentityService.create('SF', 'resource://stop-fingerprinting/webextension/icons/default/16.png', '#ff0000'); }

const sliceTabInto = exports.sliceTabInto = function sliceTabInto(tab, userContextId, url) {
	const { gBrowser, } = tab.ownerGlobal;
	// clone tabs SessionStore state into a new tab
	const newTab = gBrowser.addTab(null, { skipAnimation: true, userContextId, });
	let state = TabState.clone(gBrowser.selectedTab);
	if (url) {
		state.entries = state.entries.slice(0, state.index); // discard all forward entries
		state.entries.push({ url, originalURI: url, });
		state.index++;
	}
	gSessionStore.setTabState(newTab, JSON.stringify(state));
	newTab.setAttribute('hidden', true);
	gBrowser.moveTabTo(newTab, tab._tPos + 1);

	if (parentTab.has(tab)) { // `tab` is already a slice() of `parent`
		parentTab.set(newTab, parentTab.get(tab)); // replace `tab` as child
		closeTab(tab);
	} else {
		parentTab.set(newTab, tab);
	}
	return newTab;
};

const replaceParentTab = exports.replaceParentTab = function replaceParentTab(tab) {
	const { gBrowser, } = tab.ownerGlobal;
	tab.removeAttribute('hidden');

	// close the original tab, but skip animations and the gSessionStore
	const parent = parentTab.get(tab); parentTab.delete(tab);
	closeTab(parent); // TODO: put back
};

function closeTab(tab) {
	const { gBrowser, } = tab.ownerGlobal;

	if (gBrowser._beginRemoveTab(tab, true, null, false)) {
		gBrowser._endRemoveTab(tab);
	}
}
