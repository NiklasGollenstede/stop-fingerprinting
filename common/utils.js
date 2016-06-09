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

function notify(level, { title, message = '', url, tabId, tabTitle, }) {
	Notifications.create({
		type: 'list',
		title,
		message,
		iconUrl: icons[level] || icons.log,
		items: [
			...(message +'').match(/[^\s](?:.{15,30}(?=\s|$)|.{1,30})/gm).map(message => ({ title: '', message, })),
			tabId != null  && { title: 'Tab:  ', message: ''+ tabId, },
			tabTitle       && { title: 'Title:', message: ''+ tabTitle, },
			url            && { title: 'Url:  ', message: ''+ url, },
		].filter(x => x),
	});
}
notify.log = notify.bind(null, 'log');
notify.info = notify.bind(null, 'info');
notify.error = notify.bind(null, 'error');

return { notify, };

});
