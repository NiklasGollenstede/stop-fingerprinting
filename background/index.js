'use strict'; /* global chrome */

const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

const { notify, domainFromUrl, } = require('common/utils');

require('common/options').then(options => {
window.options = options;

const Profiles = require('background/profiles')(options);

// modify CSPs to allow script injection
chrome.webRequest.onHeadersReceived.addListener(modifyResponseHeaders, { urls: [ '*://*/*', ], }, [ 'blocking', 'responseHeaders', ]);
function modifyResponseHeaders({ requestId, url, tabId, type, responseHeaders, }) {
	const domain = domainFromUrl(url);
	const profile = Profiles.get({ requestId, tabId, url, }).getDomain(domain);
	if (profile.disabled) { return; }

	let changed = false;
	(type === 'main_frame' || type === 'sub_frame') && responseHeaders.forEach(header => {
		if ((/^(?:Content-Security-Policy)$/i).test(header.name) && header.value) { return injectCSP(header); }
	});
	profile.hstsDisabled && responseHeaders.forEach(header => {
		if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return removeHSTS(header); }
	});
	return changed ? { responseHeaders, } : { };

	function injectCSP(header) {
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

		function inject(tokens, token, test = $=>$ === token) {
			if (tokens.includes("'none'")) {
				tokens.splice(0, Infinity, token);
				return (changed = true);
			}
			if (!tokens.some(test)) {
				tokens.unshift(token);
				return (changed = true);
			}
		}

		inject(scriptSrc, "'unsafe-eval'") && (profile.misc.disableEval = true);
		inject(scriptSrc, `'nonce-${ profile.nonce }'`, $=>$ === "'unsafe-inline'");
		inject(childSrc, 'blob:') && (profile.misc.disableChildBlobUrl = true);

		if (!changed) { return; }
		header.value
		= 'default-src '+ defaultSrc.join(' ') +'; '
		+ 'script-src '+ scriptSrc.join(' ') +'; '
		+ 'child-src '+ childSrc.join(' ') +'; '
		+ 'frame-src '+ frameSrc.join(' ') +'; '
		+ others.join('; ');
		console.log('build CSP\n', header.value);
	}

	function removeHSTS(header) {
		changed = true;
		header.value = header.value.replace(/max-age=\d+/gi, () => 'max-age=0');
		console.log('HSTS header removed', domain, header);
	}
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
	const domain = domainFromUrl(url);
	const profile = (type === 'main_frame' ? Profiles.create({ requestId, url, }) : Profiles.get({ tabId, url, })).getDomain(domain);
	if (profile.disabled) { return; }

	let changed = false;
	profile.navigator && requestHeaders.forEach(header => {
		if ((/^User-Agent$/i).test(header.name) && header.value) { return replaceUA(header); }
	});
	profile.navigator && setDNT();
	return changed ? { requestHeaders, } : { };

	function replaceUA(header) {
		const ua = profile.navigator.userAgent;
		if (header.value === ua) { return; }
		changed = true;
		header.value = ua;
	}

	function setDNT() {
		const index = requestHeaders.findIndex(({ name, }) => (/^DNT$/i).test(name));
		if (index !== -1) {
			switch (profile.navigator.doNotTrack) {
				case '0': {
					if (requestHeaders[index].value === '0') { return; }
					requestHeaders[index].value = '0';
				} break;
				case '1': {
					if (requestHeaders[index].value === '1') { return; }
					requestHeaders[index].value = '1';
				} break;
				default: {
					requestHeaders.splice(index, 1);
				} break;
			}
		} else {
			if (![ '0', '1', ].includes(profile.navigator.doNotTrack)) { return; }
			requestHeaders.splice(Infinity, 0, { name: 'DNT', value: profile.navigator.doNotTrack, }); // TODO: use correct index
		}
		changed = true;
	}
}

Messages.addHandler('getOptionsForUrl', function(url) {
	const tabId = this.tab.id;
	const domain = domainFromUrl(url);
	const profile = Profiles.get({ tabId, url, }).getDomain(domain);
	console.log('getOptionsForUrl', url, domain, profile);
	return { options: JSON.stringify(profile), nonce: profile.nonce, };
});

Messages.addHandler('notify', function(method, { title, message, logLevel, topic, }) {
	const { id: tabId, url, title: tabTitle, } = this.tab;
	let domain, profile;
	if (!logLevel && topic) {
		domain = domainFromUrl(url);
		profile = Profiles.get({ tabId, url, }).getDomain(domain);
	}
	notify(method, { title, message, url, domain, tabId, tabTitle, logLevel, topic, profile, });
});

});
