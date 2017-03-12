(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/es6lib/port': Port, // also for browser.Messages
	'node_modules/web-ext-utils/browser/': { manifest, Tabs, Messages, runtime, webNavigation, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/loader/views': Views,
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/utils': { setBrowserAction, },
	'common/options': options,
	RequestListener, RequestListener: { ignore, reset, },
	Profiles,
	require,
}) => {
console.log(manifest.name, 'loaded, updates', updated);
const { isScriptable, } = global;

//	Tabs         .onCreated                   .addListener((...args) => console.log('onCreated'                   , ...args));
//	Tabs         .onRemoved                   .addListener((...args) => console.log('onRemoved'                   , ...args));
//	webNavigation.onBeforeNavigate            .addListener((...args) => console.log('onBeforeNavigate'            , ...args));
//	webNavigation.onCommitted                 .addListener((...args) => console.log('onCommitted'                 , ...args));
//	webNavigation.onErrorOccurred             .addListener((...args) => console.log('onErrorOccurred'             , ...args));

const sdkPort = new Port(runtime.connect({ name: 'sdk', }), Port.web_ext_Port).addHandlers({
	'await started'() {
		return require.main.ready.then(() => manifest.version);
	},
	async getProfile(ctxId) {
		return Profiles.get(ctxId);
	},
});

const Ctx = new Map/*<tabId, ctxId>*/;
Views.setHandler(async function inittab(view, { tabId, url, }) { // for normal tabs
	// view.getTabId.resolve(tabId);
	const ctxId = (await view.getCtxId(tabId));
	Ctx.set(tabId, ctxId);
	console.log('got ctxId', ctxId, 'for tab', tabId);
	view.location.replace(url);
});
Messages.addHandlers({ inittab(tabId, ctxId) { // for incognito and container tabs
	if (tabId !== this.tab.id) { console.error(`tabId mismatch`); }
	Ctx.set(tabId, ctxId);
	console.log('got ctxId', ctxId, 'for tab', tabId, '(remote)');
}, });
async function initTab(tabId, url) {
	(await Tabs.update(tabId, {
		url: require.toUrl('./init-tab.html') +`#inittab?tabId=${ tabId }&url=${ encodeURIComponent(url) }`,
	}));
}


// TODO: it seems that sync XHRs are not sent here by firefox
const requests = new RequestListener({
	urls: [ '*://*/*', ], // TODO: this only includes https?://
}, {
	onBeforeRequest: [ 'blocking', ],
	onBeforeSendHeaders: [ 'blocking', 'requestHeaders', ],
	onHeadersReceived: [ 'blocking', 'responseHeaders', ], // not needed in firefox (?)
}, class Request {
	constructor({ requestId, url, tabId, type, }) {
		this.requestId = requestId; this.url = url; this.type = type; this.tabId = tabId;
		console.log('request start', this);

		this.isMainFrame = type === 'main_frame';
		this.ctxId = Ctx.get(tabId);
		try { this.session = Profiles.get(this.ctxId); } // TODO: do something
		catch (error) { reportError(error); }
	}
	destroy() {
		console.log('request end', this.requestId);
	}

	// TODO: cross-origin main_frame request redirects can iterate multiple sessions ...
	onBeforeRedirect() { return reset; } // create a new instance when redirecting

	onBeforeRequest() {
		if (this.ctxId != null) { return null; }
		if (this.isMainFrame) {
			initTab(this.tabId, this.url);
			return { cancel: true, ignore, };
		}
		return ignore; // TODO: or continue with default profile?
	}

	// TODO: (only?) firefox: this is not called for the favicon
	onBeforeSendHeaders({ requestHeaders, }) {
		if (!this.session.navigator) { return null; }

		if (gecko) { // ~FF 53 lowercases all header names -.-
			requestHeaders.forEach(header => (header.name = header.name.replace(/(?:^|-)[a-z]|dnt/g, _=>_.toUpperCase()))); // TODO: this is inaccurate, especially for custom headers
		}

		const order = this.session.navigator.headerOrder;
		const headers = this.objectifyHeaders(requestHeaders, order);

		this.setUserAgent(headers, this.type);
		this.setDNT(headers);
		this.setCachControl(headers);

		// console.log('request', type, url, ordered);
		return { requestHeaders: this.orderHeaders(headers, requestHeaders, order), };
	}

	onHeadersReceived({ responseHeaders, url, }) {
		if (url !== this.url) { console.error('url changed', this.requestId, this.url, url); }

		let changed = false;

		// not firefox: disable HSTS header (has no effect in firefox, but it should have, so leave the code for now)
		changed |= this.session.hstsDisabled && responseHeaders.some(header => {
			return (/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value && this.removeHSTS(header);
		});

		return changed ? { responseHeaders, } : null;
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

// set the correct browserAction icon
setBrowserAction({ icon: 'detached', title: 'installed', });
Tabs.query({ }).then(_=>_.forEach(({ url, id: tabId, }) => !isScriptable(url) && setBrowserAction({ tabId, icon: 'inactive', title: 'browserTab', })));
Profiles.onChanged.addListener(ctxIds => {
	Ctx.forEach((id, tabId) => ctxIds.includes(id) && setBrowserAction({ tabId, icon: 'detached', title: 'optionsChanged', }));
});
webNavigation.onCommitted.addListener(({ tabId, frameId, url, }) => {
	if (frameId !== 0) { return; }
	if (!isScriptable(url)) {
		setBrowserAction({ tabId, icon: 'inactive', title: 'browserTab', });
	} else if (Profiles.getTemp(Ctx.get(tabId))) {
		setBrowserAction({ tabId, icon: 'temp', title: 'tempActive', });
	} else {
		setBrowserAction({ tabId, icon: 'default', title: 'default', });
	}
});

Object.assign(global, {
	options, Profiles, sdkPort, requests, Ctx,
	Browser: require('node_modules/web-ext-utils/browser/'),
	Loader:  require('node_modules/web-ext-utils/loader/'),
	Utils:   require('node_modules/web-ext-utils/utils/'),
});

return { Ctx, sdkPort, };

}); })(this);
