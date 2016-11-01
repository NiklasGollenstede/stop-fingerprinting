(function() { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { _async, sleep, spawn, },
	'node_modules/es6lib/object': { setConst, },
	'node_modules/web-ext-utils/chrome/': { Tabs, applications: { gecko, }, },
	Profiles,
}) {

const { isScriptable, } = window;

const tabs = new Map; // tabId ==> Tab

class Navigation {
	constructor(tab) {
		setConst(this, 'tab', tab);
		this.session = null; // : profiles/Session
		this.url = null; // : string
		this.isScriptable = false;
		Profiles.prepare();
	}

	init(url) { // returns null iff !isScriptable(url)
		this.url = url;
		this.isScriptable = isScriptable(url);
		this.session = !this.isScriptable ? null : Profiles.getSessionForPageLoad(url, this.tab.tempProfId, this.tab.session);
	}
}


class Tab {
	constructor(tabId) {
		setConst(this, 'id', tabId);
		this.tempProfId = null; // : string (uuid)
		this.url = null; // : string
		this.session = null; // : profiles/Session
		this.navigation = null; // : Navigation
		this.isScriptable = false;
		this.contentPending = false;
	}

	getSession(url, navigating) { // may return null
		if (!navigating) { return this.session; }
		if (!this.navigation) { throw new Error(`Not navigating`); }
		this.navigation.init(url);
		return this.navigation.session;
	}

	getContentProfile(url) {
	// session will be null for data: (and blob:/file:/... ?) urls.
	// for data: urls it should use the origin of the window.opener, if present, and be ignored otherwise
		if (!this.contentPending) { throw new Error(`getContentProfile requested more than once per load`); }
		this.contentPending = false;

		if (!this.session) { return null; }
		if (!this.session.origin.includes(new URL(url))) { throw new Error(`Tab origin mismatch!`); }
		return this.session.data;
	}

	startNavigation(details) {
		this.navigation = new Navigation(this);
		if (this.contentPending && this.isScriptable) { console.error('this.contentPending && this.isScriptable', this); }
	}

	commitNavigation(details) {
		this.session = this.navigation.session;
		this.url = this.navigation.url;
		this.isScriptable = this.navigation.isScriptable;
		this.navigation = null;
		this.contentPending = true;
	}

	cancelNavigation(details) {
		this.navigation = null;
	}

	destroy() { }

	static get(tabId) {
		let tab = tabs.get(tabId);
		if (tab) { return tab; }
		tab = new Tab(tabId);
		tabs.set(tabId, tab);
		return tab;
	}
}

Tabs.onRemoved.addListener(tabId => Tab.get(tabId).destroy() === tabs.delete(tabId));

return Tab;

}); })();
