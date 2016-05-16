'use strict'; /* global chrome */

// modify CSPs to allow unsafe script evaluation
chrome.webRequest.onHeadersReceived.addListener(
	(details) => {
		const { responseHeaders, } = details;
		responseHeaders.forEach(header => {
			if (!(/^(?:(?:X-)?Content-Security-Policy|X-WebKit-CSP)$/i).test(header.name) || !header.value) { return; }
			header.value = header.value.replace(/default-src|script-src/i, "$& 'unsafe-inline'"); // TODO: replace this by "'sha256-...'"
		});
		return { responseHeaders, };
	},
	{ urls: [ '*://*/*', ], },
	[ 'blocking', 'responseHeaders', ]
);

var excludeRegEx = [ ], excludePattern = [ ], excludes = [ ];
const escape = string => string.replace(/[\-\[\]\{\}\(\)\*\+\?\.\,\\\^\$\|\#]/g, '\\$&');

require('background/options').then(options => {
	const matchPattern = options.excludePattern.restrict.match;

	options.excludeRegEx.whenChange((_, { current: values, }) => excludes = excludePattern.concat(excludeRegEx = values.map(string => new RegExp(string))));

	options.excludePattern.whenChange((_, { current: values, }) => excludes = excludeRegEx.concat(excludePattern = values.map(pattern => {
		const [ , sheme, host, path, ] = matchPattern.exec(pattern);
		return new RegExp('^(?:'+
			(sheme === '*' ? '(?:https?|ftp|file|ftp)' : sheme)
			+':\/\/'+
			escape(host).replace(/\\\*/g, '[^\/]*')
			+'\/'+
			escape(path).replace(/\\\*/g, '.*')
		+')$');
	})));
});

require('web-ext-utils/chrome').messages.addHandler('getOptionsForUrl', url => {
	console.log('getOptionsForUrl', url);
	for (let i = 0; i < excludes.length; ++i) {
		const match = excludes[i].exec(url);
		if (match && match[0] === url) { console.log('excluding ', url, 'which matches', excludes[i]); return false; }
	}
	return { };
});
