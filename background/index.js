'use strict'; /* global chrome */

const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

require('common/options').then(options => {
window.options = options;

const { get: getOptions, } = require('background/profiles')(options);

// modify CSPs to allow unsafe script injection
options.weakenCsp.when({
	true: () => chrome.webRequest.onHeadersReceived.addListener(weakenCsp, { urls: [ '*://*/*', ], }, [ 'blocking', 'responseHeaders', ]),
	false: () => chrome.webRequest.onHeadersReceived.removeListener(weakenCsp),
});
function weakenCsp(details) {
	const { responseHeaders, } = details;
	let changed = false;
	responseHeaders.forEach(header => {
		if (!(/^(?:(?:X-)?Content-Security-Policy|X-WebKit-CSP)$/i).test(header.name) || !header.value) { return; }
		changed = true;
		header.value = header.value.replace(/default-src|script-src/i, "$& 'unsafe-inline' 'unsafe-eval'"); // TODO: replace this by "'sha256-...'"
	});
	changed && console.log('removed CSP from', details);
	return changed ? { responseHeaders, } : { };
}

Messages.addHandler('getOptionsForUrl', url => {
	console.log('getOptionsForUrl', url);
	return getOptions(url);
});

});
