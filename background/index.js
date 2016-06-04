'use strict'; /* global chrome */

const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

require('common/options').then(options => {
window.options = options;

const Profiles = require('background/profiles')(options);

// modify CSPs to allow script injection
chrome.webRequest.onHeadersReceived.addListener(modifyResponseHeaders, { urls: [ '*://*/*', ], types: [ 'main_frame', 'sub_frame', ], }, [ 'blocking', 'responseHeaders', ]);

function modifyResponseHeaders({ requestId, url, tabId, type, responseHeaders, }) {
	const domain = ((/^[^:\/\\]+:\/\/([^\/\\]+)/).exec(url) || [ , '<invalid domain>', ])[1];
	const profile = Profiles.get({ requestId, tabId, url, }).get(domain);

	let changed = false;
	responseHeaders.forEach(header => {
		if (!(/^(?:(?:X-)?Content-Security-Policy|X-WebKit-CSP)$/i).test(header.name) || !header.value) { return; }
		let defaultSrc = [ ], scriptSrc = [ ], others = [ ];
		header.value.trim().split(/\s*;\s*/g).forEach(directive => {
			if ((/^default-src\s+/i).test(directive)) { return defaultSrc.push(directive.split(/\s+/g).slice(1)); }
			if ((/^script-src\s+/i).test(directive)) { return scriptSrc.push(directive.split(/\s+/g).slice(1)); }
			others.push(directive);
		});
		const isOk = defaultSrc.every(sources => !sources.includes("'none'") && sources.includes("'unsafe-inline'"));
		if (isOk && !scriptSrc.length) { return; }
		if (scriptSrc.length) {
			scriptSrc = scriptSrc.map(sources => {
				if (sources.includes("'none'")) {
					changed = true;
					return [ `'nonce-${ profile.nonce }'`, ];
				}
				if (!sources.includes("'unsafe-inline'")) {
					changed = true;
					sources.unshift(`'nonce-${ profile.nonce }'`);
				}
				return sources;
			});
		} else {
			changed = true;
			scriptSrc = [ [ `'nonce-${ profile.nonce }'`, ].concat(defaultSrc[0] || [ ]), ];
		}
		header.value
		= defaultSrc.map(sources => 'default-src '+ sources.join(' ') +'; ')
		+ scriptSrc.map(sources => 'script-src '+ sources.join(' ') +'; ')
		+ others.join('; ');
		// console.log('build CSP\n', header.value, '\nfrom', defaultSrc, scriptSrc, others);
	});
	changed && console.log('injected nonce-'+ profile.nonce);
	return changed ? { responseHeaders, } : { };
}

const allMainFrames = { urls: [ '<all_urls>', ], types: [ 'main_frame', ], };
chrome.webRequest.onHeadersReceived  .addListener(commitProfile,  allMainFrames); // this may be to early, but onResponseStarted is to late
chrome.webRequest.onAuthRequired
&& chrome.webRequest.onAuthRequired  .addListener(discardProfile, allMainFrames);
chrome.webRequest.onBeforeRedirect   .addListener(discardProfile, allMainFrames);
chrome.webRequest.onErrorOccurred    .addListener(discardProfile, allMainFrames);
function commitProfile({ requestId, url, tabId, }) {
	const profile = Profiles.get({ requestId, });
	profile && profile.commit({ tabId, url, });
}
function discardProfile({ requestId, url, tabId, }) {
	const profile = Profiles.get({ requestId, });
	profile && profile.destroy();
}

chrome.webRequest.onBeforeSendHeaders.addListener(modifyRequestHeaders, { urls: [ '<all_urls>', ], }, [ 'blocking', 'requestHeaders', ]);

function modifyRequestHeaders({ requestId, url, tabId, type, requestHeaders, }) {
	const domain = getDomain(url);
	const profile = (type === 'main_frame' ? Profiles.create({ requestId, url, }) : Profiles.get({ tabId, url, })).get(domain);
	const ua = profile.navigator.userAgent;
	const header = requestHeaders.find(header => (/^User-Agent$/i).test(header.name));
	// console.log('onBeforeSendHeaders', url, domain, { old: header.value, new: ua, });
	if (header.value !== ua) {
		header.value = ua;
		return { requestHeaders, };
	}
	return { };
}

Messages.addHandler('getOptionsForUrl', function (url) {
	const tabId = this.tab.id;
	const domain = getDomain(url);
	const profile = Profiles.get({ tabId, url, }).get(domain);
	console.log('getOptionsForUrl', url, domain, profile);
	return JSON.stringify(profile);
});

function getDomain(url) {
	return ((/^[^:\/\\]+:\/\/([^\/\\]+)/).exec(url) || [ , '<invalid domain>', ])[1];
}

});
