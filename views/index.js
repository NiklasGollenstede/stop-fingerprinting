(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/loader/home': Home,
	'node_modules/web-ext-utils/browser/': { extension: { getURL, }, },
	'node_modules/es6lib/dom': { createElement, },
}) => {

return new Home({
	tabs: [ {
		id: 'options',
		title: 'Options',
		icon: getURL('icons/options/96.png'),
	}, /*{
		id: 'browser',
		title: current.replace(/^./, c => c.toUpperCase()),
		icon: getURL(`icons/${ current }/96.png`),
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
	}, {
		id: '404',
		title: 'Error',
		icon: getURL('icons/error/256.png'),
		hidden: true, default: true,
	}, ],
	index: 'options',
	style: [ 'vertical', 'firefox', 'dark', ],
	head: [
		createElement('link', { href: getURL(`node_modules/web-ext-utils/options/editor/index.css`), rel: 'stylesheet', }),
		createElement('link', { href: getURL(`node_modules/web-ext-utils/options/editor/dark.css`), rel: 'stylesheet', }),
	],
});

}); })(this);
