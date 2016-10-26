(function() { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { async, sleep, },
	'node_modules/es6lib/port': for_chrome_Messages,
	'node_modules/web-ext-utils/chrome/': { Tabs, Messages: { request, post, }, applications: { blink, } },
}) {

document.querySelector('#open-options').addEventListener('click', ({ button, }) => {
	!button && (blink ? post('openOptions') : request('openOptions').then(() => window.close()));
});
const select = document.querySelector('#tab-profile');
const getProfiles = request('Profiles.getNames');
const tabId = (yield Tabs.query({ currentWindow: true, active: true, }))[0].id;
const current = (yield request('Profiles.getTempProfileForTab', tabId));

(yield getProfiles).forEach(({ id, name, }) => {
	const option = document.createElement('option');
	option.textContent = name.replace(/^(.{0,28})(?:(.{1,3})|(.*))$/gm, (_, $1, $2, $3) => $1 + ($3 ? '...' : $2 || ''));
	option.value = id;
	select.appendChild(option);
});

const selected = select.querySelector(`[value="${ (current || '<none>') }"]`);
selected && (selected.selected = true);

select.addEventListener('change', async(function*({ target: { value: profileId, }, }) {
	if ((yield request('Profiles.setTempProfileForTab', tabId, profileId === '<none>' ? null : profileId))) {
		// done
	} else {
		// failed
	}
}, error => console.error(error)));

}); })();
