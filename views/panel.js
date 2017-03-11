(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/dom': { createElement, },
	'node_modules/web-ext-utils/browser/': { Tabs, },
	'node_modules/web-ext-utils/utils/': { showExtensionTab, reportError, },
	'background/profiles': Profiles,
	'background/tab': Tab,
	require,
}) => async window => {
const { document, } = window;

document.head.appendChild(createElement('link', { rel: 'stylesheet', href: `node_modules/web-ext-utils/options/editor/index.css`, }));
document.head.appendChild(createElement('link', { rel: 'stylesheet', href: `node_modules/web-ext-utils/options/editor/dark.css`, }));
document.head.appendChild(createElement('link', { rel: 'stylesheet', href: require.toUrl(`./index.css`), }));

document.body.insertAdjacentHTML('beforeend', `
	<style>${ CSS() }</style>
	<h3>Stop Fingerprinting</h3>
	<span> You can choose any of the profiles you created on the settings page to temporary overrule every other profile for this tab: </span>
	<select id="tab-profile"> <option value="<none>">&lt;None&gt;</option> </select>
	<input type="button" id="open-options" value="Options">
`);

document.querySelector('#open-options').addEventListener('click', ({ button, }) => { try {
	if (button) { return; }
	showExtensionTab('/view.html#options', '/view.html');
	window.close();
} catch (error) { reportError(error); } });

const select = document.querySelector('#tab-profile');

Profiles.getNames().forEach(({ id, name, }) => {
	const option = document.createElement('option');
	option.textContent = name.replace(/^(.{0,28})(?:(.{1,3})|(.*))$/gm, (_, $1, $2, $3) => $1 + ($3 ? '...' : $2 || ''));
	option.value = id;
	select.appendChild(option);
});

const tabId = window.activeTab || (await Tabs.query({ currentWindow: true, active: true, }))[0].id;
const selected = select.querySelector(`[value="${ (Tab.get(tabId).tempProfId || '<none>') }"]`);
selected && (selected.selected = true);

select.addEventListener('change', ({ target: { value: profileId, }, }) => { try {
	Tab.get(tabId).tempProfId = profileId === '<none>' ? null : profileId;
} catch (error) { reportError(error); } });

function CSS() { return`
	body {
		width: 220px;
		margin: 0;
		padding: 10px;
	}
	_:-moz-tree-row(hover), body { /* firefox only */
		border: 2px solid white;
	}

	input, select, option {
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 5px 0;
	}
	input, select {
		width: 200px;
	}
`; }

}); })(this);
