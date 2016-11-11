(function() { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { _async, sleep, spawn, },
	'node_modules/es6lib/object': { setConst, },
	'node_modules/web-ext-utils/chrome/': { Tabs, Messages, applications: { gecko, }, },
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
		this.session = !this.isScriptable ? null : Profiles.getSessionForPageLoad(
			url, this.tab.tempProfId,
			this.session || this.tab.session // init() will be called multiple times if the fain_frame request is redirected.
			// If possible, it should use the session of the previous request. TODO: actually, it should try both
		);
	}
}


class Tab {
	constructor(tabId) {
		setConst(this, 'id', tabId);
		this.tempProfId = null; // : string (uuid)
		this.url = null; // : string
		this.session = null; // : profiles/Session
		this.navigation = null; // : Navigation
		this.isScriptable = false; // whether isScriptable(this.url)
		this.contentPending = false; // whether .getContentProfile() has been called since .commitNavigation()
		this.changedSession = true; // whether .commitNavigation() changed the value of this.session
		this.loadCount = 0; // number of times .getContentProfile() was called (successfully), and thus the number of scriptable pages loaded in the tab
		this.pastSessions = new Map; // nonce => Session; all `.session`s this ever had
		this.mustResetOnCrossNavigation = false;
	}

	resetOnCrossNavigation() {
		console.log('.mustResetOnCrossNavigation = true', this);
		this.mustResetOnCrossNavigation = true;
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
		// if (!this.contentPending) { throw new Error(`getContentProfile requested more than once per load`); } // TODO: this should not happen, but it does. This is not really a problem itself, but it indicates other errors
		this.contentPending = false;
		this.loadCount++;

		if (!this.session) { return null; }
		if (!this.session.origin.includes(url)) { throw new Error(`Tab origin mismatch!`); }
		return {
			profile: this.session.data,
			changed: this.changedSession,
			pageLoadCount: this.loadCount,
			includes: this.session.origin.regExp.source,
		};
	}

	startNavigation(details) {
		this.navigation = new Navigation(this);
		if (this.contentPending && this.isScriptable) { console.error('this.contentPending && this.isScriptable', this); }
	}

	commitNavigation(details) {
		if (this.navigation.url) {
			this.changedSession = this.session !== this.navigation.session;
			this.session = this.navigation.session;
			this.pastSessions.set(this.session.data.nonce, this.session);
			this.url = this.navigation.url;
			this.isScriptable = this.navigation.isScriptable;
			this.navigation = null;
			this.contentPending = true;
		} else { // there was no webRequest to get the main_frame
			this.url = details.url;
			this.isScriptable = isScriptable(this.url);
			this.navigation = null;
			this.contentPending = true;
			if (!this.isScriptable) {
				this.changedSession = this.session !== null;
				this.session = null;
			} else { // see if the page was cached and still knows its session
				Messages.request({ tabId: this.id, frameId: 0, }, 'getCurrentProfile')
				.then(tabData => { // this shouldn't be async ...
					let session = null;
					if (tabData == null) {
						console.log('restored null session');
					} else {
						console.log('restored session', tabData);
						session = this.pastSessions.get(tabData.id) || null;
						if (!session || !session.origin.includes(tabData.url)) { console.error('failed to restore session', session, tabData.url); }
					}
					this.changedSession = this.session !== session;
					this.session = session;
				});
			}
		}
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
