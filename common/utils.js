'use strict'; define('common/utils', [ // license: MPL-2.0
	'icons/urls',
	'web-ext-utils/chrome',
], function(
	icons,
	{ chrome, Tabs, Notifications, BrowserAction, applications: { webkit, }, }
) {

const titles = {
	default: 'Stop Fingerprinting is active',
	tempActive: 'A temporary profile overwrite is active for this tab',
	installed: 'Stop Fingerprinting was just installed. The protection for this tab will be inconsistent until it gets reloaded',
	tempChanged: 'The temporary overwrite for this domain changed. Please reload to apply',
	optionsChanged: 'Options affecting this tab changed. Please reload to apply',
	equivChanged: 'A change in the equivalent domains affects this tab. Please reload',
	includesChanged: 'A change in the include domains of a profile affects this tab. Please reload',
	// includesNew: 'A new profile was created that may affects this tab. Please reload',
	// includesDeleted: 'A profile that may have affected this tab was deleted. Please reload',
};

const logLevels = {
	debug: 1,
	log: 2,
	info: 3,
	error: 4,
};

function notify(method, { title, message = '', url, domain, tabId, tabTitle, logLevel, }) {
	if (logLevel && logLevel > (logLevels[method] || 2)) { return /*console.log('skipping message', logLevel, method, arguments[1])*/; }

	Notifications.create({
		type: 'list',
		title,
		message,
		iconUrl: (icons[method] || icons.log)[256],
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

function setBrowserAction({ tab, tabId, tabs, tabIds, filter, icon, title, text, }) {
	return (
		filter
		? Tabs.query({ }).then(_=>_.filter(filter).map(_=>_.id))
		: Promise.resolve(tabIds || tabs && tabs.map(_=>_.id) || tab && [ tab.id, ] || tabId && [ tabId, ] || [ null, ])
	).then(tabIds => Promise.all(tabIds.map(tabId => {
		(title || text) && chrome.browserAction.setTitle({ tabId, title: titles[title] || text || title, });
		return icon && BrowserAction.setIcon({ tabId, path: icons[icon], });
	})).then(() => tabIds));
}

function domainFromUrl(url) {
	const location = new URL(url);
	return location.hostname || location.protocol;
}

function nameprep(string) {
	try {
		if (!string) { return string; }
		if (webkit) {
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

const DOMAIN_CHARS = /[^\x00-\x20\#\*\/\:\?\@\[\\\]\|\x7F\xA0\¨\xAD\¯\´\¸]/; // there are others that don't work, but they are browser dependant. They need to be filtered later
// Array(0xff/*ff*/).fill(1).map((_, i) => i).filter(i => { try { new URL('http://'+ String.fromCharCode(i)).host; } catch(e) { return true; } }).map(i => '\\u'+ i.toString(16)).join('')

return { notify, setBrowserAction, domainFromUrl, nameprep, DOMAIN_CHARS, };

});
