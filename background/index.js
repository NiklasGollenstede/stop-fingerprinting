'use strict'; // license: MPL-2.0

const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

const { notify, domainFromUrl, } = require('common/utils');
const { debounce, } = require('es6lib/functional');
const RequestListener = require('background/request');
const { ignore, reset, } = RequestListener;

require('common/options').then(options => {
window.options = options;

const Profiles = window.Profiles = require('background/profiles')(options);

// TODO: do cached pages from the history pose a problem?
new RequestListener(class {
	constructor({ requestId, url, tabId, type, }) {
		this.requestId = requestId; this.url = url; this.type = type, this.tabId = tabId;
		const domain = this.domain = domainFromUrl(url);
		const profile = this.profile = type === 'main_frame' ? Profiles.create({ requestId, domain, tabId, }) : Profiles.get({ tabId, domain, });
		if (profile.disabled) { this.destroy(); throw ignore; }
		console.log('request start', this.requestId);
	}
	destroy() {
		console.log('request end', this.requestId);
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

	// TODO: (only?) firefox: this is not called for the favicon
	onBeforeSendHeaders({ requestId, url, tabId, type, requestHeaders, }) {
		if (!this.profile.navigator) { return; }

		const order = this.profile.navigator.headerOrder;
		const headers = this.objectifyHeaders(requestHeaders, order);

		this.setUserAgent(headers, type);
		this.setDNT(headers);
		this.setCachControl(headers);

		// console.log('request', type, url, ordered);
		return { requestHeaders: this.orderHeaders(headers, requestHeaders, order), };
	}

	onHeadersReceived({ requestId, url, tabId, type, responseHeaders, }) { // was only [ '*://*/*', ]
		let changed = false;
		changed |= (type === 'main_frame' || type === 'sub_frame') && responseHeaders.some(header => {
			if ((/^(?:Content-Security-Policy)$/i).test(header.name) && header.value) { return this.injectCSP(header); }
		});
		changed |= this.profile.hstsDisabled && responseHeaders.some(header => {
			if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return this.removeHSTS(header); }
		});

		type === 'main_frame' && this.profile.commit(tabId);

		if (changed) { return { responseHeaders, }; }
	}

	onAuthRequired({ type, }) {
		if (type === 'main_frame') { this.profile.tab.destroy(); throw reset; }
	}
	onBeforeRedirect({ type, }) {
		if (type === 'main_frame') { this.profile.tab.destroy(); throw reset; }
	}
	onErrorOccurred({ type, }) {
		if (type === 'main_frame') { this.profile.tab.destroy(); }
	}
}, { urls: [ '<all_urls>', ], }, {
	onBeforeSendHeaders: [ 'blocking', 'requestHeaders', ],
	onHeadersReceived: [ 'blocking', 'responseHeaders', ],
});

// clear cache on requests
let clearCacheWhat = null, clearCacheWhere = null;
const clearCache = (() => {
	return debounce(() => { // works
		chrome.browsingData.remove({ since: 0, originTypes: clearCacheWhere, }, clearCacheWhat);
	}, 3000);

	const interval = 3000; let queued = false, last = 0;
	const clearCache = () => chrome.browsingData.remove({ since: 0, originTypes: clearCacheWhere, }, clearCacheWhat, () => {
		// console.log('cleared cache', clearCacheWhere, clearCacheWhat);
		queued = false; last = Date.now();
	});

	return function() {
		if (queued) { return; } queued = true; // for some reason 'queued' is true before this function was ever called
		setTimeout(clearCache, last + interval - Date.now());
	};
})();
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
	false: () => chrome.webRequest.onHeadersReceived.removeListener(clearCache),
	true: () => chrome.webRequest.onHeadersReceived.addListener(clearCache, { urls: [ '*://*/*', ], }, [ ]),
});

Messages.addHandler('getOptions', function() {
	const tabId = this.tab.id;
	const domain = domainFromUrl(this.tab.url);
	const profile = Profiles.get({ tabId, domain, });
	console.log('getOptions', domain, profile);
	return { options: JSON.stringify(profile), nonce: profile.nonce, };
});

Messages.addHandler('notify', function(method, { title, message, url, }) {
	const { id: tabId, title: tabTitle, } = this.tab;
	const domain = domainFromUrl(url);
	const logLevel = Profiles.findStack(domain).get('logLevel');
	notify(method, { title, message, url, tabId, tabTitle, logLevel, });
});

// set the correct browserAction icon
chrome.tabs.onUpdated.addListener(function(tabId, info, { url, }) {
	if (!('status' in info)) { return; }
	const path = chrome.extension.getURL('icons/'+ (Profiles.getTemp(domainFromUrl(url)) == null ? 'default' : 'changed') +'/');
	chrome.browserAction.setIcon({ tabId, path: { 19: path +'19.png', 38: path +'38.png', }});
});

});
