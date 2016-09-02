(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { async, },
	'node_modules/web-ext-utils/chrome/': { Tabs, Messages: { request, post, }, applications: { blink, } },
}) {

const select = document.querySelector('#tab-profile');
request('Profiles.getNames').then(_=>_.forEach(({ id, name, }) => {
	const option = document.createElement('option');
	option.textContent = name.replace(/^(.{0,28})(?:(.{1,3})|(.*))$/gm, (_, $1, $2, $3) => $1 + ($3 ? '...' : $2 || ''));
	option.value = id;
	select.appendChild(option);
}));

document.querySelector('#open-options').addEventListener('click', ({ button, }) => {
	!button && (blink ? post('openOptions') : request('openOptions').then(() => window.close()));
});

const domain = domainFromUrl((
	(yield Tabs.query({ currentWindow: true, active: true, }))
)[0].url);
const current = (yield request('Profiles.getTemp', domain));

const selected = select.querySelector('[value="'+ current +'"]');
selected && (selected.selected = true);

select.addEventListener('change', ({ target: { value: profileId, }, }) => {
	request('Profiles.setTemp', domain, profileId);
});

function domainFromUrl(url) {
	const location = new URL(url);
	return location.hostname || location.protocol;
}

}); })();
