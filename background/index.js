'use strict'; /* global chrome */

const { Tabs, Messages, } = require('web-ext-utils/chrome');
Messages.isExclusiveMessageHandler = true;

require('common/options').then(options => {
window.options = options;

const Profiles = require('background/profiles')(options);

// modify CSPs to allow unsafe script injection
options.children.weakenCsp.when({
	true: () => chrome.webRequest.onHeadersReceived.addListener(weakenCsp, { urls: [ '*://*/*', ], }, [ 'blocking', 'responseHeaders', ]),
	false: () => chrome.webRequest.onHeadersReceived.removeListener(weakenCsp),
});
function weakenCsp({ type, responseHeaders, }) {
	if (type !== 'main_frame' && type !== 'sub_frame') { return; }

	let changed = false;
	responseHeaders.forEach(header => {
		if (!(/^(?:(?:X-)?Content-Security-Policy|X-WebKit-CSP)$/i).test(header.name) || !header.value) { return; }
		let defaultSrc = [ ], scriptSrc = [ ], others = [ ];
		header.value.trim().split(/\s*;\s*/g).forEach(directive => {
			if ((/^default-src\s+/i).test(directive)) { return defaultSrc.push(directive.split(/\s+/g).slice(1)); }
			if ((/^script-src\s+/i).test(directive)) { return scriptSrc.push(directive.split(/\s+/g).slice(1)); }
			others.push(directive);
		});
		const isOk = defaultSrc.every(sources => !sources.includes("'none'") && sources.includes("'unsafe-eval'") && sources.includes("'unsafe-inline'"));
		if (isOk && !scriptSrc.length) { return; }
		if (scriptSrc.length) {
			scriptSrc = scriptSrc.map(sources => {
				if (sources.includes("'none'")) {
					changed = true;
					return [ "'unsafe-eval'", "'unsafe-inline'", ];
				}
				if (!sources.includes("'unsafe-inline'")) {
					changed = true;
					sources.unshift("'unsafe-inline'");
				}
				if (!sources.includes("'unsafe-eval'")) {
					changed = true;
					sources.unshift("'unsafe-eval'");
				}
				return sources;
			});
		} else {
			changed = true;
			scriptSrc = [ [ "'unsafe-eval'", "'unsafe-inline'", ].concat(defaultSrc[0] || [ ]), ];
		}
		header.value
		= defaultSrc.map(sources => 'default-src '+ sources.join(' ') +'; ')
		+ scriptSrc.map(sources => 'script-src '+ sources.join(' ') +'; ')
		+ others.join('; ');
		// console.log('build CSP\n', header.value, '\nfrom', defaultSrc, scriptSrc, others);
	});
	return changed ? { responseHeaders, } : { };
}

Messages.addHandler('getOptionsForUrl', url => {
	const domain = ((/^[^:\/\\]+:\/\/([^\/\\]+)/).exec(url) || [ , '<invalid domain>', ])[1];
	console.log('getOptionsForUrl', url, domain);
	const profile = Profiles.get(url);
	return profile.getInjectOptions(domain);
});

});
