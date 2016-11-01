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

let nativeConnector; // chrome only: NativeConnector instance while it runs, null while it is down
let echoPortNum = 0; // chrome only: the port number the native echo server runs at
let started = true; // may be set to a promise that must resolve for this module to load successfully
const openMainFrameRequests = new Map; // tabId ==> Requests with .type === 'main_frame' that are currently active

// start sync connection to content script
if (gecko) {
	Messages.addHandler('getSenderProfile', function() { // TODO: only allow for top frame
		console.log('getSenderProfile', this);
		const session = Profiles.getSessionForTab(this.tab.id, this.tab.url);
		// session will be null for data: (and blob:/file:/... ?) urls. Those need to be handled in some way
		// should probably listen to webNavigation to detect tab loads (and unloads!) that don't cause a network request
		// for data: urls it should use the origin of the window.opener, if present, and be ignored otherwise
		return session ? session.data : null;
	});
} else {
	// in chrome the only way to send a synchronous message (from the content script to the background)
	// is to set request headers to a sync XHR and have a local http server 'echo' those headers into the response

	started = require.async('./native-connector').then(_ => new _({
		version: 1,
		ports: [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ],
		onStart: async(function*() {
			nativeConnector = this;
			echoPortNum = (yield this.port.request('getPort'));
			console.log(`Native app running on https://localhost:${ echoPortNum }/`);
		}),
		onStop() {
			nativeConnector = null;
			echoPortNum = 0;
			console.error(`Native app closed, restarting ...`);
			this.start();
		},
	}).start()).then(() => true);
}

// chrome only: this url (with the correct port) is used to load the options. But only while the main_frame is loading
const getOptionsUrl = !gecko && (/^https\:\/\/localhost\:(\d+)\/stop_fingerprint_get_options$/);

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

		this.isMainFrame && openMainFrameRequests.set(this.id, this);
		this.isOptionsRequest = false; // chrome only

		const session = this.session = this.isMainFrame
		? Profiles.getSessionForPageLoad(tabId, url)
		: Profiles.getSessionForTab(tabId, url);

		if (!session && !this.isMainFrame) { return ignore; } // TODO: this is not always the best idea ...

		const profile = this.profile = session.data;

		if (profile.disabled) { return ignore; }
	}
	destroy() {
		// console.log('request end', this.requestId);
		this.isMainFrame && openMainFrameRequests.delete(this.id);
	}

	// chrome only: filter requests to the echo server
	[!gecko && 'onBeforeRequest']() {
		const match = getOptionsUrl.exec(this.url);
		if (!match) { return; }
		if (+match[1] !== echoPortNum) { // cancel if port is wrong, the content script will try the next port
			console.log('cancel getOptions request on wrong port', +match[1]);
			return { cancel: true, };
		}
		if (false && !openMainFrameRequests.has(this.tabId)) { // cancel if the tabs main_frame isn't pending (to prevent the content from reading the options)
			// TODO: this doesn't work yet
			console.log(`cancel getOptions request made while the main_frame isn't pending`);
			return { cancel: true, };
		}
		this.isOptionsRequest = true;
	}

	[!gecko && 'getEchoOptions']() {
		if (!this.isOptionsRequest) { return null; }
		return {
			ignore,
			requestHeaders: [
				{ name: 'x-options', value: JSON.stringify(this.profile), },
				{ name: 'x-nonce', value: this.profile.nonce, },
			],
		};
	}

	// TODO: (only?) firefox: this is not called for the favicon
	onBeforeSendHeaders({ requestHeaders, }) {
		const options = !gecko && this.getEchoOptions();
		if (options) { return options; }

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

		// not firefox: modify CSP to allow script injection
		changed |= !gecko && (this.type === 'main_frame' || this.type === 'sub_frame') && responseHeaders.some(header => {
			if ((/^(?:Content-Security-Policy)$/i).test(header.name) && header.value) { return this.injectCSP(header); }
		});

		// not firefox: disable HSTS header (has no effect in firefox)
		changed |= !gecko && this.profile.hstsDisabled && responseHeaders.some(header => {
			if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return this.removeHSTS(header); }
		});

		this.type === 'main_frame' && this.session.attachToTab(this.tabId);

		if (changed) { return { responseHeaders, }; }
	}

	onAuthRequired() {
		if (this.type === 'main_frame') { this.session.detachFromTab(this.tabId); return reset; }
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

	injectCSP(header) {
		let changed = false;
		// modify CSPs to allow script injection
		// reference: https://www.w3.org/TR/CSP/
		// even though frame-src is deprecated, it will probably not be removed for a long time, and it provides a convenient way to allow 'blob:' only in workers
		let defaultSrc = [ '*', ], scriptSrc, childSrc, frameSrc, others = [ ];
		header.value.trim().split(/\s*;\s*/g).forEach(directive => { // TODO: check case sensitivity
			if ((/^default-src\s+/i).test(directive)) { return (defaultSrc = directive.split(/\s+/g).slice(1)); }
			if ((/^script-src\s+/i).test(directive)) { return (scriptSrc = directive.split(/\s+/g).slice(1)); }
			if ((/^child-src\s+/i).test(directive)) { return (childSrc = directive.split(/\s+/g).slice(1)); }
			if ((/^frame-src\s+/i).test(directive)) { return (frameSrc = directive.split(/\s+/g).slice(1)); }
			others.push(directive);
		});
		!scriptSrc && (scriptSrc = defaultSrc.slice());
		!childSrc && (childSrc = defaultSrc.slice());
		!frameSrc && (frameSrc = childSrc.slice());

		function inject(tokens, token, test = _=>_=== token) {
			if (tokens.includes("'none'")) {
				tokens.splice(0, Infinity, token);
				return (changed = true);
			}
			if (!tokens.some(test)) {
				tokens.unshift(token);
				return (changed = true);
			}
		}

		inject(scriptSrc, "'unsafe-eval'") && (this.profile.misc.disableEval = true);
		inject(scriptSrc, `'nonce-${ this.profile.nonce }'`, $=>$ === "'unsafe-inline'");
		inject(childSrc, 'blob:') && (this.profile.misc.disableChildBlobUrl = true);

		if (!changed) { return; }
		header.value
		= 'default-src '+ defaultSrc.join(' ') +'; '
		+ 'script-src '+ scriptSrc.join(' ') +'; '
		+ 'child-src '+ childSrc.join(' ') +'; '
		+ 'frame-src '+ frameSrc.join(' ') +'; '
		+ others.join('; ');
		// console.log('build CSP\n', header.value);
		return true;
	}

	removeHSTS(header) {
		header.value = header.value.replace(/max-age=\d+/gi, () => 'max-age=0');
		// console.log('HSTS header removed', this.domain, header);
		return true;
	}
});

// chrome only: clear cache on requests
let clearCacheWhat = null, clearCacheWhere = null;
const clearCache = throttle(() => browsingData.remove({ since: 0, originTypes: clearCacheWhere, }, clearCacheWhat), 3000);
options.children.clearCache.children.what.whenChange(value => clearCacheWhat = ({
	passive:  { appcache: true, cache: true, pluginData: true, },
	active:   { appcache: true, cache: true, pluginData: true, serviceWorkers: true, cookies: true, serverBoundCertificates: true, indexedDB: true, localStorage: true, webSQL: true, fileSystems: true, },
	all:      { appcache: true, cache: true, pluginData: true, serviceWorkers: true, cookies: true, serverBoundCertificates: true, indexedDB: true, localStorage: true, webSQL: true, fileSystems: true, downloads: true, formData: true, history: true, passwords: true, },
})[value]);
options.children.clearCache.children.where.whenChange(value => clearCacheWhere = ({
	unprotectedWeb:  { unprotectedWeb: true, },
	protectedWeb:    { unprotectedWeb: true, protectedWeb: true, },
	extension:       { unprotectedWeb: true, protectedWeb: true, extension: true, },
})[value]);
options.children.clearCache.children.where.when({
	false: () => webRequest.onHeadersReceived.removeListener(clearCache), // is always false in firefox
	true: () => webRequest.onHeadersReceived.addListener(clearCache, { urls: [ '*://*/*', ], }, [ ]),
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

(yield started);

}); })();
