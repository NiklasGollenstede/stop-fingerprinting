define('background/main', [ // license: MPL-2.0
	'common/options',
	'background/profiles',
	'web-ext-utils/update/result',
], function(
	options,
	Profiles,
	updated
) {
window.options = options;
window.Profiles = Profiles;

const {
	concurrent: { sleep, },
} = require('es6lib');
const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

const { notify, domainFromUrl, setBrowserAction, } = require('common/utils');
const { debounce, } = require('es6lib/functional');
const RequestListener = require('background/request');
const { ignore, reset, } = RequestListener;
const icons = require('icons/urls');

/// tabIds whose tabs have loaded their main_frame document but have not yet completed getOptions()
const stalledTabs = new Map; // TODO: do per frame

// TODO: do cached pages from the history pose a problem?
new RequestListener({
	urls: [ '<all_urls>', ],
}, {
	onBeforeRequest: [ 'blocking', ],
	onBeforeSendHeaders: [ 'blocking', 'requestHeaders', ],
	onHeadersReceived: [ 'blocking', 'responseHeaders', ],
}, class {
	constructor({ requestId, url, tabId, type, }) {
		console.log('request start', this.requestId);
		this.requestId = requestId; this.url = url; this.type = type, this.tabId = tabId;
		const domain = this.domain = domainFromUrl(url);
		const profile = this.profile = type === 'main_frame' ? Profiles.create({ requestId, domain, tabId, }) : Profiles.get({ tabId, domain, });
		if (profile.disabled) { this.destroy(); throw ignore; }
	}
	destroy() {
		console.log('request end', this.requestId);
	}

	onBeforeRequest() { return;
		if (this.type !== 'script' || !stalledTabs.has(this.tabId)) { return; }
		console.log('stalling tab', this.tabId);
		stalledTabs.get(this.tabId).add(this.url);
		return { cancel: true, };
	}

	// TODO: (only?) firefox: this is not called for the favicon
	onBeforeSendHeaders({ requestHeaders, }) {
		if (!this.profile.navigator) { return; }

		const order = this.profile.navigator.headerOrder;
		const headers = this.objectifyHeaders(requestHeaders, order);

		this.setUserAgent(headers, this.type);
		this.setDNT(headers);
		this.setCachControl(headers);

		// console.log('request', type, url, ordered);
		return { requestHeaders: this.orderHeaders(headers, requestHeaders, order), };
	}

	onHeadersReceived({ responseHeaders, }) { // was only [ '*://*/*', ]
		let changed = false;
		changed |= (this.type === 'main_frame' || this.type === 'sub_frame') && responseHeaders.some(header => {
			if ((/^(?:Content-Security-Policy)$/i).test(header.name) && header.value) { return this.injectCSP(header); }
		});
		changed |= this.profile.hstsDisabled && responseHeaders.some(header => {
			if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return this.removeHSTS(header); }
		});

		stalledTabs.set(this.tabId, new Set);

		if (this.type === 'main_frame') {
			this.profile.attachTo(this.tabId);

			// this lands _before_ the navigation happened, to set the options for the context_script injected directly afterwards
			// this is the fastest way to inject custom content into a new page
			// TODO: find out what happens if the navigation is cancelled, or if the old page has any other way to read this
			chrome.tabs.executeScript(this.tabId, { code: (`
				window.name = \`${ this.profile.nonce +','+ JSON.stringify(this.profile).replace('`', '\\`') }\`;
			`), });
		}

		if (changed) { return { responseHeaders, }; }
	}

	onAuthRequired() {
		if (this.type === 'main_frame') { this.profile.detachFrom(this.tabId); throw reset; }
	}
	onBeforeRedirect() {
		if (this.type === 'main_frame') { this.profile.detachFrom(this.tabId); throw reset; }
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
const clearCache = debounce(() => chrome.browsingData.remove({ since: 0, originTypes: clearCacheWhere, }, clearCacheWhat), 3000);
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
	const stalledScripts = Array.from(stalledTabs.get(tabId) || [ ]);
	stalledTabs.delete(tabId);
	return /*sleep(300).then(() => (*/{
		nonce: profile.nonce,
		options: JSON.stringify(profile)
		.replace(/\}$/, () => ', "stalledScripts": '+ JSON.stringify(stalledScripts) +'}'),
	}/*))*/;
});

Messages.addHandler('notify', function(method, { title, message, url, }) {
	const { id: tabId, title: tabTitle, } = this.tab;
	const domain = domainFromUrl(url);
	const logLevel = Profiles.findStack(domain).get('logLevel');
	notify(method, { title, message, url, tabId, tabTitle, logLevel, });
});

Messages.addHandler('openOptions', () => {
	const window = chrome.extension.getViews({ type: 'tab', }).find(_=>_.location.pathname === '/ui/home/index.html');
	window ? chrome.tabs.update(window.tabId, { active: true, }) : chrome.tabs.create({ url: chrome.extension.getURL('ui/home/index.html#options'), });
});

Messages.addHandler('Profiles.setTemp', (...args) => Profiles.setTemp(...args));
Messages.addHandler('Profiles.getTemp', (...args) => Profiles.getTemp(...args));
Messages.addHandler('Profiles.getCurrent', () => Array.from(Profiles.current.values()).map(({ children: { id: { value: id, }, title: { value: name, }, }, }) => ({ id, name, })));

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

});
