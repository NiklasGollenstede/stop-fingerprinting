'use strict'; define('common/utils', [
	'web-ext-utils/chrome',
], function(
	{ Notifications, }
) {

const icons = {
	log: chrome.extension.getURL('icons/log/256.png'),
	info: chrome.extension.getURL('icons/info/256.png'),
	error: chrome.extension.getURL('icons/error/256.png'),
};

function notify(level, { title, message = '', url, domain, tabId, tabTitle, }) {
	Notifications.create({
		type: 'list',
		title,
		message,
		iconUrl: icons[level] || icons.log,
		items: [
			domain   != null && { title: 'Domain:', message: ''+ domain, },
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

return { notify, };

});
