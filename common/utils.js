'use strict'; define('common/utils', [ // license: MPL-2.0
	'web-ext-utils/chrome',
], function(
	{ Notifications, applications: { chromium, }, }
) {

const icons = {
	debug: chrome.extension.getURL('icons/debug/256.png'),
	log: chrome.extension.getURL('icons/log/256.png'),
	info: chrome.extension.getURL('icons/info/256.png'),
	error: chrome.extension.getURL('icons/error/256.png'),
};
const logLevels = {
	debug: 1,
	log: 2,
	info: 3,
	error: 4,
};

function notify(method, { title, message = '', url, domain, tabId, tabTitle, logLevel, }) {
	if (logLevel && logLevel > (logLevels[method] || 2)) { return console.log('skipping message', logLevel, method, arguments[1]); }

	Notifications.create({
		type: 'list',
		title,
		message,
		iconUrl: icons[method] || icons.log,
		items: [
			domain && url == null && { title: 'Domain:', message: ''+ domain, },
			url      != null && { title: 'Url:   ', message: ''+ url, },
			tabId    != null && { title: 'Tab:   ', message: ''+ tabId, },
			tabTitle != null && { title: 'Title: ', message: ''+ tabTitle, },
			...(message +'').match(/[^\s](?:.{20,33}(?=\s|$)|.{20,33}[\/\\]|.{1,33})/gm).map(message => ({ title: '', message, })),
		].filter(x => x),
	});
}
notify.log = notify.bind(null, 'log');
notify.info = notify.bind(null, 'info');
notify.error = notify.bind(null, 'error');

function domainFromUrl(url) {
	const location = new URL(url);
	return location.hostname || location.protocol;
}

function nameprep(string) {
	try {
		if (!string) { return string; }
		if (chromium) {
			string = string.split('.').map(string => new URL('http://'+ string).host).join('.');
		} else {
			string = new URL('http://'+ string).host;
		}
		return string.replace(/%2A/g, '*'); // chrome url-escapes chars, but the wildcard needs to stay
	} catch(e) {
		return nameprep(Array.from(string).filter(char => {
			try { return new URL('http://'+ char); } catch(e) { notify.error({
				title: `Invalid char "${ char }"`,
				message: `The invalid character "${ char }" in the domain part "${ string }" has been ignored`,
			}); }
		}).join(''));
	}
}

const DOMAIN_CHARS = String.raw`[^\x00-\x20\#\*\/\:\?\@\[\\\]\|\x7F\xA0\¨\xAD\¯\´\¸]`; // there are others that don't work, but they are browser dependant. They need to be filtered later
// Array(0xff/*ff*/).fill(1).map((_, i) => i).filter(i => { try { new URL('http://'+ String.fromCharCode(i)).host; } catch(e) { return true; } }).map(i => '\\u'+ i.toString(16)).join('')

return { notify, domainFromUrl, nameprep, DOMAIN_CHARS, };

});
