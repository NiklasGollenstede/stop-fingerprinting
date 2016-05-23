'use strict';


document.addEventListener('DOMContentLoaded', () => {
	const tabs = new (require('web-ext-utils/tabview'))({
		host: document.body,
		content: (() => { const frame = document.createElement('iframe'); frame.style.border = 'none'; return frame; })(),
		active: location.hash.replace(/^\#/, '') || 'options',
		style: 'vertical firefox',
		tabs: [
			{
				id: 'options',
				title: 'Options',
				icon: chrome.extension.getURL('ui/options/icon.png'),
				data: { url: chrome.extension.getURL('ui/options/index.html'), },
			},
		],
		onSelect({ id, data, }) {
			(this.content.src !== data.url) && (this.content.src = data.url);
			document.location.hash = id;
		},
	});
	window.addEventListener('popstate', event => tabs.active = location.hash.replace(/^\#/, ''));
});
