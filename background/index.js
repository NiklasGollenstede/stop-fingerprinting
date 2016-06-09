'use strict'; /* global chrome */

const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

const { notify, } = require('common/utils');

require('common/options').then(options => {
window.options = options;

const Profiles = require('background/profiles')(options);

// modify CSPs to allow script injection
chrome.webRequest.onHeadersReceived.addListener(modifyResponseHeaders, { urls: [ '*://*/*', ], }, [ 'blocking', 'responseHeaders', ]);
function modifyResponseHeaders({ requestId, url, tabId, type, responseHeaders, }) {
	const domain = ((/^[^:\/\\]+:\/\/([^\/\\]+)/).exec(url) || [ , '<invalid domain>', ])[1];
	const profile = Profiles.get({ requestId, tabId, url, }).getDomain(domain);

	let changed = false;
	(type === 'main_frame' || type === 'sub_frame') && responseHeaders.forEach(header => {
		if ((/^(?:(?:X-)?Content-Security-Policy|X-WebKit-CSP)$/i).test(header.name) && header.value) { return injectCSP(header); }
	});
	profile.get('hstsDisabled') && responseHeaders.forEach(header => {
		if ((/^(?:Strict-Transport-Security)$/i).test(header.name) && header.value) { return removeHSTS(header); }
	});
	return changed ? { responseHeaders, } : { };

	function injectCSP(header) {
		let defaultSrc = [ ], scriptSrc = [ ], others = [ ];
		header.value.trim().split(/\s*;\s*/g).forEach(directive => {
			if ((/^default-src\s+/i).test(directive)) { return defaultSrc.push(directive.split(/\s+/g).slice(1)); }
			if ((/^script-src\s+/i).test(directive)) { return scriptSrc.push(directive.split(/\s+/g).slice(1)); }
			others.push(directive);
		});
		const isOk = defaultSrc.every(sources => !sources.includes("'none'") && sources.includes("'unsafe-inline'") && sources.includes("'unsafe-eval'"));
		if (isOk && !scriptSrc.length) { return; }
		if (scriptSrc.length) {
			scriptSrc = scriptSrc.map(sources => {
				if (sources.includes("'none'")) {
					changed = true; profile.misc.disableEval = true;
					return [ `'nonce-${ profile.nonce }'`, `'unsafe-eval'`, ];
				}
				if (!sources.includes("'unsafe-eval'")) {
					changed = true; profile.misc.disableEval = true;
					sources.unshift(`'unsafe-eval'`);
				}
				if (!sources.includes("'unsafe-inline'")) {
					changed = true;
					sources.unshift(`'nonce-${ profile.nonce }'`);
				}
				return sources;
			});
		} else {
			changed = true; profile.misc.disableEval = true;
			scriptSrc = [ [ `'nonce-${ profile.nonce }'`, `'unsafe-eval'`, ].concat(defaultSrc[0] || [ ]), ];
		}
		if (!changed) { return; }
		header.value
		= defaultSrc.map(sources => 'default-src '+ sources.join(' ') +'; ')
		+ scriptSrc.map(sources => 'script-src '+ sources.join(' ') +'; ')
		+ others.join('; ');
		console.log('build CSP\n', header.value, '\nfrom', defaultSrc, scriptSrc, others);
	}

	function removeHSTS(header) {
		changed = true;
		header.value = header.value.replace(/max-age=\d+/gi, () => 'max-age=0');
		console.log('hsts header removed', domain, header);
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
	const domain = getDomain(url);
	const profile = (type === 'main_frame' ? Profiles.create({ requestId, url, }) : Profiles.get({ tabId, url, })).getDomain(domain);

	let changed = false;
	requestHeaders.forEach(header => {
		if ((/^User-Agent$/i).test(header.name) && header.value) { return replaceUA(header); }
	});
	setDNT();
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
	const domain = getDomain(url);
	const profile = Profiles.get({ tabId, url, }).getDomain(domain);
	console.log('getOptionsForUrl', url, domain, profile);
	return { options: JSON.stringify(profile), nonce: profile.nonce, };
});

Messages.addHandler('notify', function(level, title, message) {
	const { id: tabId, url, title: tabTitle, } = this.tab;
	notify(level, { title, message, url, tabId, tabTitle, });
	console[level](this, title, message);
});

function getDomain(url) {
	return ((/^[^:\/\\]+:\/\/([^\/\\]+)/).exec(url) || [ , '<invalid domain>', ])[1];
}

});
