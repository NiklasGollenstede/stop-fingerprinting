'use strict'; // license: MPL-2.0
const { Profiles, } = chrome.extension.getBackgroundPage(); // TODO: Firefox private window: Error: Permission denied to access property "Profiles"

const tab = new Promise((resolve, reject) => chrome.tabs.query({
	currentWindow: true, active: true,
}, tab => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(tab)));

document.addEventListener('DOMContentLoaded', () => {
	const select = document.querySelector('#tab-profile');
	Profiles.current.forEach(({ children: { title: { value: name, }, }, }, id) => {
		const option = document.createElement('option');
		option.textContent = name.replace(/^(.{0,28})(?:(.{1,3})|(.*))$/gm, (_, _1, _2, _3) => _1 + (_3 ? '...' : _2 || ''));
		option.value = id;
		select.appendChild(option);
	});
	tab.then(([ tab, ]) => {
		const selector = '[value="'+ Profiles.getTemp(tab.id) +'"]';
		const selected = select.querySelector(selector);
		selected && (selected.selected = true);
		select.addEventListener('change', ({ target: { value: profileId, }, }) => {
			Profiles.setTemp(tab.id, profileId);
		});
	});

	document.querySelector('#open-options').addEventListener('click', ({ button, }) => {
		!button && chrome.tabs.create({ url: chrome.extension.getURL('ui/home/index.html'), }, () => window.close());
	});
});
