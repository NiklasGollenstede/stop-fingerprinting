'use strict'; // license: MPL-2.0

const browser = chrome.extension.getURL('.').startsWith('moz') ? 'firefox' : 'chrome';

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
				icon: chrome.extension.getURL('icons/options/96.png'),
				data: { url: chrome.extension.getURL('ui/options/index.html'), },
			}, {
				id: 'browser',
				title: 'Browser',
				icon: chrome.extension.getURL(`icons/${ browser }/96.png`),
				data: { url: chrome.extension.getURL(`ui/browser/${ browser }.html`), },
			}, {
				id: 'state',
				title: 'State',
				icon: chrome.extension.getURL('icons/state/96.png'),
				data: { url: chrome.extension.getURL('ui/state/index.html'), },
			}, {
				id: 'issues',
				title: 'Issues',
				icon: chrome.extension.getURL('icons/issues/96.png'),
				data: { url: chrome.extension.getURL('ui/issues/index.html'), },
			}, {
				id: 'about',
				title: 'About',
				icon: chrome.extension.getURL('icons/about/96.png'),
				data: { url: chrome.extension.getURL('ui/about/index.html'), },
			},
		],
		onSelect({ id, data, }) {
			(this.content.src !== data.url) && (this.content.src = data.url);
			document.location.hash = id;
		},
	});
	window.addEventListener('popstate', event => tabs.active = location.hash.replace(/^\#/, ''));
});

chrome.tabs.getCurrent(tab => window.tabId = tab.id);
