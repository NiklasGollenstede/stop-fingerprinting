'use strict'; // license: MPL-2.0

const { async, } = require('es6lib/concurrent');
const { Tabs, messages: { request, }, } = require('web-ext-utils/chrome');

const tab = new Promise((resolve, reject) => chrome.tabs.query({
	currentWindow: true, active: true,
}, tab => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(tab)));

document.addEventListener('DOMContentLoaded', async(function*() {
	const select = document.querySelector('#tab-profile');
	request('Profiles.getCurrent').then(_=>_.forEach(({ name, id, }) => {
		const option = document.createElement('option');
		option.textContent = name.replace(/^(.{0,28})(?:(.{1,3})|(.*))$/gm, (_, $1, $2, $3) => $1 + ($3 ? '...' : $2 || ''));
		option.value = id;
		select.appendChild(option);
	}));

	document.querySelector('#open-options').addEventListener('click', ({ button, }) => {
		!button && request('openOptions').then(() => window.close());
	});

	const domain = domainFromUrl((yield Tabs.query({
		currentWindow: true, active: true,
	}))[0].url);

	const current = (yield request('Profiles.getTemp', domain));
	const selector = '[value="'+ current +'"]';
	const selected = select.querySelector(selector);
	selected && (selected.selected = true);
	select.addEventListener('change', ({ target: { value: profileId, }, }) => {
		request('Profiles.setTemp', domain, profileId);
	});
}));

function domainFromUrl(url) {
	const location = new URL(url);
	return location.hostname || location.protocol;
}
