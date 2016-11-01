(function() { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/es6lib/concurrent': { sleep, async, },
	'node_modules/es6lib/functional': { throttle, },
	'node_modules/es6lib/port': for_chrome_Messages,
	'node_modules/web-ext-utils/chrome/': { Tabs, Messages, browsingData, webNavigation, webRequest, applications: { gecko, }, content, },
	'node_modules/web-ext-utils/utils': { showExtensionTab, },
	'common/utils': { notify, domainFromUrl, setBrowserAction, },
	'common/options': options,
	'icons/urls': icons,
	sdkConection,
	RequestListener, RequestListener: { ignore, reset, },
	Profiles,
	require,
}) {
console.log('Ran updates', updated);

window.options = options;
window.Profiles = Profiles;
window.Chrome = window.Browser = arguments[0]['node_modules/web-ext-utils/chrome/'];

	Messages.addHandler('getSenderProfile', function() { // TODO: only allow for top frame
		console.log('getSenderProfile', this);
		const session = Profiles.getSessionForTab(this.tab.id, this.tab.url);
		// session will be null for data: (and blob:/file:/... ?) urls. Those need to be handled in some way
		// should probably listen to webNavigation to detect tab loads (and unloads!) that don't cause a network request
		// for data: urls it should use the origin of the window.opener, if present, and be ignored otherwise
		return session ? session.data : null;
	});

// TODO: do cached pages from the tab history pose a problem?
// TODO: it seems that sync XHRs are not sent here by firefox
new RequestListener({
	// urls: [ '*://*/*', ],
	urls: [ '<all_urls>', ],
}, {
	onBeforeRequest: [ 'blocking', ],
	onBeforeSendHeaders: [ 'blocking', 'requestHeaders', ],
	onHeadersReceived: [ 'blocking', 'responseHeaders', ], // not needed in firefox (?)
}, class Request {
	constructor({ requestId, url, tabId, type, }) {
		this.requestId = requestId; this.url = url; this.type = type, this.tabId = tabId;
		// console.log('request start', this);
		this.isMainFrame = type === 'main_frame';

		if (this.isMainFrame && gecko && url.startsWith('https://addons.mozilla.org/')) { return ignore; } // can't attach content_scripts anyway

		const session = this.session = this.isMainFrame
		? Profiles.getSessionForPageLoad(tabId, url)
		: Profiles.getSessionForTab(tabId, url);

		if (!session && !this.isMainFrame) { return ignore; } // TODO: this is not always the best idea ...

		const profile = this.profile = session.data;

		if (profile.disabled) { return ignore; }
	}
	destroy() {
		// console.log('request end', this.requestId);
	}

	// TODO: (only?) firefox: this is not called for the favicon
	onBeforeSendHeaders({ requestHeaders, }) {
		if (!this.session.navigator) { return; }

		const order = this.session.navigator.headerOrder;
		const headers = this.objectifyHeaders(requestHeaders, order);

		this.setUserAgent(headers, this.type);
		this.setDNT(headers);
		this.setCachControl(headers);

		// console.log('request', type, url, ordered);
		return { requestHeaders: this.orderHeaders(headers, requestHeaders, order), };
	}

	onHeadersReceived({ responseHeaders, }) {
		let changed = false;

		// not firefox: disable HSTS header (has no effect in firefox, but it should have, so leave the code for now)
		changed |= this.profile.hstsDisabled && responseHeaders.some(header => {
			if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return this.removeHSTS(header); }
		});

		this.type === 'main_frame' && this.session.attachToTab(this.tabId);

		if (changed) { return { responseHeaders, }; }
	}

	onBeforeRedirect() {
		if (this.type === 'main_frame') { this.session.detachFromTab(this.tabId); return reset; }
	}
	onErrorOccurred() {
		if (this.type === 'main_frame') { this.session.detachFromTab(this.tabId); }
	}

	objectifyHeaders(headers, which) {
		const out = { }; headers.forEach((header, index) => {
			if (which && !which.includes(header.name)) { return; }
			out[header.name] = header; // may overwrite existing
			delete headers[index];
		});
		return out;
	}

	orderHeaders(headers, remaining, order) {
		const ordered = [ ];
		order.forEach(name => headers[name] && ordered.push(headers[name]));
		ordered.push(...remaining.filter(x => x && x.name !== 'X-Client-Data')); // append any custom headers
		// NOTE: chrome ignores the order, 'Cache-Control' and 'Connection', firefox follows it and appends any additional headers (e.g.'If-...') at the end
		return ordered;
	}

	setUserAgent(headers, type) {
		const { navigator, } = this.session;
		headers['User-Agent'].value = navigator.userAgent;
		navigator.accept[type] && (headers['Accept'] = { name: 'Accept', value: navigator.accept[type], });
		navigator.acceptLanguage['en-US'] && (headers['Accept-Language'] = { name: 'Accept-Language', value: navigator.acceptLanguage['en-US'], });
		navigator.acceptEncoding && (headers['Accept-Encoding'] = { name: 'Accept-Encoding', value: navigator.acceptEncoding, });
	}

	setDNT(headers) {
		const { navigator, } = this.session;
		const DNT = navigator.doNotTrack;
		if (DNT === '1' || DNT === '0') { headers['DNT'] = { name: 'DNT', value: DNT, }; }
		else { delete headers.DNT; }
	}

	setCachControl(headers) {
		headers['Cache-Control'] = { name: 'Cache-Control', value: 'max-age=0', };
		headers['Connection'] = { name: 'Connection', value: 'keep-alive', };
	}

	removeHSTS(header) {
		header.value = header.value.replace(/max-age=\d+/gi, () => 'max-age=0');
		// console.log('HSTS header removed', this.domain, header);
		return true;
	}
});

// let other views and the content post notifications
Messages.addHandler('notify', function(method, { title, message, url, }) {
	url || (url = this.tab.url);
	const { id: tabId, title: tabTitle, } = this.tab;
	const logLevel = Profiles.getSessionForTab(tabId, url).data.logLevel;
	notify(method, { title, message, url, tabId, tabTitle, logLevel, });
});

Messages.addHandler('openOptions', () => showExtensionTab('/ui/home/index.html#options', '/ui/home/index.html'));

Messages.addHandlers('Profiles.', Profiles);

// set the correct browserAction icon
setBrowserAction({ icon: 'detached', title: 'installed', });
Tabs.onUpdated.addListener(function(tabId, info, { url, }) {
	if (!('status' in info)) { return; }
	setBrowserAction(
		Profiles.getSessionForTab(tabId, url) == null
		? { tabId, icon: 'inactive', title: 'browserTab', }
		: Profiles.getTempProfileForTab(tabId) == null
		? { tabId, icon: 'default', title: 'default', }
		: { tabId, icon: 'temp', title: 'tempActive', }
	);
});

}); })();
