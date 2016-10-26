(function() { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/tabview/': TabView,
	'node_modules/web-ext-utils/chrome/': { extension, applications: { current, gecko, }, },
	'node_modules/es6lib/dom': { createElement, DOMContentLoaded, },
}) {

(yield DOMContentLoaded);

const initialTitle = document.title || 'Stop Fingerprinting';

const tabView = new TabView({
	host: document.body,
	content: createElement('iframe', { style: { border: 'none', }, }),
	active: location.hash.replace(/^\#/, '') || 'options',
	style: 'vertical firefox',
	tabs: [
		{
			id: 'options',
			title: 'Options',
			icon: extension.getURL('icons/options/96.png'),
			data: { url: extension.getURL('ui/options/index.html'), },
		}, {
			id: 'browser',
			title: current.replace(/^./, c => c.toUpperCase()),
			icon: extension.getURL(`icons/${ current }/96.png`),
			data: { url: extension.getURL(`ui/browser/${ current }.html`), },
		}, {
			id: 'state',
			title: 'State',
			icon: extension.getURL('icons/state/96.png'),
			data: { url: extension.getURL('ui/state/index.html'), },
		}, {
			id: 'issues',
			title: 'Issues',
			icon: extension.getURL('icons/issues/96.png'),
			data: { url: extension.getURL('ui/issues/index.html'), },
		}, {
			id: 'about',
			title: 'About',
			icon: extension.getURL('icons/about/96.png'),
			data: { url: extension.getURL('ui/about/index.html'), },
		},
	],
	onSelect(tab) {
		if (gecko && !this.content.src && tab.data.url.endsWith('/options/index.html')) {
			setTimeout(() => this.content.src = tab.data.url, 10); // this fixes some strange bug in Firefox where browser.storage.local.get() won't resolve
		} else if (this.content.src !== tab.data.url) {
			this.content.src = tab.data.url;
		}
		document.location.hash = tab.id;
		document.title = tab.textContent +' - '+ initialTitle;
	},
});
window.addEventListener('popstate', event => tabView.active = location.hash.replace(/^\#/, ''));

}); })();

(function() { 'use strict'; (window.browser || window.chrome).tabs.getCurrent(tab => tab && (window.tabId = tab.id)); })();
