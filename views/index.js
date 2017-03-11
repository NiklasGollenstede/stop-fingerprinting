(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/tabview/': TabView,
	'node_modules/web-ext-utils/browser/': { manifest, extension: { getURL, }, },
	'node_modules/es6lib/dom': { createElement, },
	'node_modules/es6lib/object': { cloneOnto, },
	require,
}) => {

const handlers = { };

require([ 'node_modules/web-ext-utils/loader/views', ], ({ getHandler, setHandler, }) => {
	setHandler('', Home);
	tabs.forEach(tab => (handlers[tab.id] = getHandler(tab.id)) === setHandler(tab.id, Home));
});

const tabs = [
	{
		id: 'options',
		title: 'Options',
		icon: getURL('icons/options/96.png'),
	}, /*{
		id: 'browser',
		title: current.replace(/^./, c => c.toUpperCase()),
		icon: getURL(`icons/${ current }/96.png`),
		data: { url: getURL(`ui/browser/${ current }.html`), },
	},*/ {
		id: 'state',
		title: 'State',
		icon: getURL('icons/state/96.png'),
	}, {
		id: 'issues',
		title: 'Issues',
		icon: getURL('icons/issues/96.png'),
	}, {
		id: 'about',
		title: 'About',
		icon: getURL('icons/about/96.png'),
	},
];

async function Home(window, options, name) {
	if (window.top !== window.self) {
		return void handlers[name](window, options, name);
	}
	const { document, } = window;

	document.body.style.background = '#222';

	const tabView = new TabView({
		host: document.body,
		content: document.createElement('div'),
		active: name || 'options',
		style: 'vertical firefox',
		tabs: cloneOnto([ ], tabs),

		async onSelect({ id, data, textContent: title, }) {
			for (const frame of this.content.children) { frame.style.display = 'none'; }
			let frame = data.frame; if (!frame) {
				frame = data.frame = (await new Promise(loaded => this.content.appendChild(createElement('iframe', {
					style: { border: 'none', width: '100%', height: 'calc(100% - 5px)', },
					onload: _=>loaded(_.target),
				}))));
				const view = frame.contentWindow, { document, } = view;
				view.background = global;
				document.documentElement.classList.add('preload');
				(await Promise.all([ 'dark', 'index', ].map(style => new Promise(loaded => document.head.appendChild(createElement('link', {
					href: getURL(`node_modules/web-ext-utils/options/editor/${ style }.css`), rel: 'stylesheet',
					onload: _=>loaded(_.target),
				}))))));
				(await handlers[id](view, { }, id));
				global.setTimeout(() => document.documentElement.classList.remove('preload'), 500);
			}
			frame.style.display = '';
			// setTimeout(() => this.content.src = tab.data.url, 10); // this fixes some strange bug in Firefox where browser.storage.local.get() won't resolve
			document.location.hash = id;
			document.title = title +' - '+ manifest.name;
		},
	});
	window.addEventListener('popstate', () => (tabView.active = window.location.hash.replace(/^\#|\?.*$/g, '')));

}

return Home;

}); })(this);
