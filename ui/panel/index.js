(function() { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': Port,
}) { /* globals browser, */

const Messages = new Port(browser, Port.web_ext_Runtime);

document.querySelector('#open-options').addEventListener('click', ({ button, }) => {
	!button && Messages.request('openOptions').then(() => window.close());
});
const select = document.querySelector('#tab-profile');
const getProfiles = Messages.request('getProfilesNames');
const tabId = (yield browser.tabs.query({ currentWindow: true, active: true, }))[0].id;
const current = (yield Messages.request('getTempProfileForTab', tabId));

(yield getProfiles).forEach(({ id, name, }) => {
	const option = document.createElement('option');
	option.textContent = name.replace(/^(.{0,28})(?:(.{1,3})|(.*))$/gm, (_, $1, $2, $3) => $1 + ($3 ? '...' : $2 || ''));
	option.value = id;
	select.appendChild(option);
});

const selected = select.querySelector(`[value="${ (current || '<none>') }"]`);
selected && (selected.selected = true);

select.addEventListener('change', ({ target: { value: profileId, }, }) =>
	Messages.request('setTempProfileForTab', tabId, profileId === '<none>' ? null : profileId)
	.catch(error => console.error(error))
);

}); })();
