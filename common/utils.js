'use strict'; define('common/utils', [
	'web-ext-utils/chrome',
], function(
	{ Notifications, }
) {

const icons = {
	debug: chrome.extension.getURL('icons/log/256.png'),
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

function notify(method, { title, message = '', url, domain, tabId, tabTitle, profile, topic, logLevel, }) {
	logLevel = logLevel || (topic && profile +(profile[topic] && profile[topic].logLevel) || 2);
	if (logLevel > (logLevels[method] || 2)) { return console.log('skipping message', method, arguments[1]); }

	Notifications.create({
		type: 'list',
		title,
		message,
		iconUrl: icons[method] || icons.log,
		items: [
			url      == null && { title: 'Domain:', message: ''+ domain, },
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
	try {
		const location = new URL(url);
		const { origin, } = location;
		return origin !== 'null' ? origin.replace(/:\d+$/, '') : location.protocol +'//'+ location.host;
	} catch (error) {
		alert('could not extract domain from url "'+ url +'"!'); debugger;
		return '<invalid domain>';
	}
}

return { notify, domainFromUrl, };

});
