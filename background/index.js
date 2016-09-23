(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/es6lib/concurrent': { sleep, async, },
	'node_modules/es6lib/functional': { throttle, },
	'node_modules/web-ext-utils/chrome/': { Tabs, Messages, Runtime: { sendNativeMessage, }, browsingData, webRequest, },
	'node_modules/web-ext-utils/utils': { showExtensionTab, },
	'common/utils': { notify, domainFromUrl, setBrowserAction, },
	'common/options': options,
	'icons/urls': icons,
	RequestListener, RequestListener: { ignore, reset, },
	Profiles,
	Native,
}) {
console.log('Ran updates', updated);

window.options = options;
window.Profiles = Profiles;

let echoPort = 0;
const native = new Native({
	version: 1,
	ports: [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ],
	onStart: async(function*() {
		echoPort = (yield this.port.request('getPort'));
		console.log(`Native app running on https://localhost:${ echoPort }/`);
	}),
	onStop() {
		echoPort = 0;
		console.error(`Native app closed, restarting ...`);
		this.start();
	},
});
const started = native.start();

const getOptionsUrl = (/^https\:\/\/localhost\:(\d+)\/stop_fingerprint_get_options$/);

// TODO: do cached pages from the history pose a problem?
new RequestListener({
	urls: [ '*://*/*', ],
	// urls: [ '<all_urls>', ],
}, {
	onBeforeRequest: [ 'blocking', ],
	onBeforeSendHeaders: [ 'blocking', 'requestHeaders', ],
	onHeadersReceived: [ 'blocking', 'responseHeaders', ],
}, class {
	constructor({ requestId, url, tabId, type, }) {
		this.requestId = requestId; this.url = url; this.type = type, this.tabId = tabId;
		console.log('request start', this);
		const domain = this.domain = domainFromUrl(url);
		const profile = this.profile = type === 'main_frame' ? Profiles.create({ requestId, domain, tabId, }) : Profiles.get({ tabId, domain, });
		if (profile.disabled) { return ignore; }
	}
	destroy() {
		console.log('request end', this.requestId);
	}

	onBeforeRequest() {
		const match = getOptionsUrl.exec(this.url);
		// TODO: it seems that sync XHRs are not sent here by firefox
		if (match && +match[1] !== echoPort) { // get-options request to wrong port
			console.log('cancel getOptions request on port', +match[1]);
			return { cancel: true, };
		}
	}

	// TODO: (only?) firefox: this is not called for the favicon
	onBeforeSendHeaders({ requestHeaders, }) {
		if (getOptionsUrl.test(this.url)) {
			// TODO: only allow this once per frame
			this.profile.misc.main_frame = this.type === 'main_frame';
			return {
				ignore,
				requestHeaders: [
					{ name: 'x-options', value: JSON.stringify(this.profile), },
					{ name: 'x-nonce', value: this.profile.nonce, },
				],
			};
		}

		if (!this.profile.navigator) { return; }

		const order = this.profile.navigator.headerOrder;
		const headers = this.objectifyHeaders(requestHeaders, order);

		this.setUserAgent(headers, this.type);
		this.setDNT(headers);
		this.setCachControl(headers);

		// console.log('request', type, url, ordered);
		return { requestHeaders: this.orderHeaders(headers, requestHeaders, order), };
	}

	onHeadersReceived({ responseHeaders, }) {
		let changed = false;
		changed |= (this.type === 'main_frame' || this.type === 'sub_frame') && responseHeaders.some(header => {
			if ((/^(?:Content-Security-Policy)$/i).test(header.name) && header.value) { return this.injectCSP(header); }
		});
		changed |= this.profile.hstsDisabled && responseHeaders.some(header => {
			if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return this.removeHSTS(header); }
		});

		this.type === 'main_frame' && this.profile.attachTo(this.tabId);

		if (changed) { return { responseHeaders, }; }
	}

	onAuthRequired() {
		if (this.type === 'main_frame') { this.profile.detachFrom(this.tabId); return reset; }
	}
	onBeforeRedirect() {
		if (this.type === 'main_frame') { this.profile.detachFrom(this.tabId); return reset; }
	}
	onErrorOccurred() {
		if (this.type === 'main_frame') { this.profile.detachFrom(this.tabId); }
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
		const { navigator, } = this.profile;
		headers['User-Agent'].value = navigator.userAgent;
		navigator.accept[type] && (headers['Accept'] = { name: 'Accept', value: navigator.accept[type], });
		navigator.acceptLanguage['en-US'] && (headers['Accept-Language'] = { name: 'Accept-Language', value: navigator.acceptLanguage['en-US'], });
		navigator.acceptEncoding && (headers['Accept-Encoding'] = { name: 'Accept-Encoding', value: navigator.acceptEncoding, });
	}

	setDNT(headers) {
		const { navigator, } = this.profile;
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
		console.log('build CSP\n', header.value);
		return true;
	}

	removeHSTS(header) {
		header.value = header.value.replace(/max-age=\d+/gi, () => 'max-age=0');
		console.log('HSTS header removed', this.domain, header);
		return true;
	}
});

// clear cache on requests
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
	false: () => webRequest.onHeadersReceived.removeListener(clearCache),
	true: () => webRequest.onHeadersReceived.addListener(clearCache, { urls: [ '*://*/*', ], }, [ ]),
});

Messages.addHandler('getOptions', function() {
	const tabId = this.tab.id;
	const domain = domainFromUrl(this.tab.url);
	const profile = Profiles.get({ tabId, domain, });
	console.log('getOptions', domain, profile);
	return /*sleep(300).then(() => (*/{
		nonce: profile.nonce,
		options: JSON.stringify(profile),
	}/*))*/;
});

Messages.addHandler('notify', function(method, { title, message, url, }) {
	url || (url = this.tab.url);
	const { id: tabId, title: tabTitle, } = this.tab;
	const domain = domainFromUrl(url);
	const logLevel = Profiles.findStack(domain).get('logLevel');
	notify(method, { title, message, url, tabId, tabTitle, logLevel, });
});

Messages.addHandler('openOptions', () => showExtensionTab('/ui/home/index.html#options', '/ui/home/index.html'));

Messages.addHandlers('Profiles.', Profiles);

// set the correct browserAction icon
setBrowserAction({ icon: 'detached', title: 'installed', });
Tabs.onUpdated.addListener(function(tabId, info, { url, }) {
	if (!('status' in info)) { return; }
	setBrowserAction(
		Profiles.getTemp(domainFromUrl(url)) == null
		? { tabId, icon: 'default', title: 'default', }
		: { tabId, icon: 'temp', title: 'tempActive', }
	);
});

(yield started);

}); })();
