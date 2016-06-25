'use strict'; // license: MPL-2.0

const features = window.features;
const featureStates = window.featureStates;

const browser = chrome.extension.getURL('.').startsWith('moz') ? 'firefox' : 'chrome';

function createRow({ title, description, state, }) {
	state = state[browser] || state.all;
	const stateKey = Object.keys(state)[0];
	const note = state[stateKey];

	const row = document.createElement('tr');
	const _description = row.appendChild(document.createElement('td'));
	const _state = row.appendChild(document.createElement('td'));
	const _note = row.appendChild(document.createElement('td'));

	_description.innerHTML = sanatize(description.replace(new RegExp('('+ title +')|^(?!.*'+ title +')', 'i'), (_, _1) => title.bold() + (_1 ? '' : ': ')));
	_state.textContent = featureStates[stateKey].title;
	_state.title = featureStates[stateKey].description;
	_note.innerHTML = sanatize(note);
	row.className = 'feature state-'+ stateKey;
	row.style.backgroundColor = `hsl(${ featureStates[stateKey].color }, 100%, 25%)`;
	return row;
}

function createSection({ title, }) {
	const row = document.createElement('tr');
	const _title = row.appendChild(document.createElement('td'));
	_title.textContent = title;
	row.className = 'section';
	return row;
}

const table = document.querySelector('#status');

Object.keys(features).forEach(section => {
	table.appendChild(createSection(features[section]));
	const { entries, } = features[section];
	Object.keys(entries).forEach(key => {
		table.appendChild(createRow(entries[key]));
	});
});

function sanatize(html) {
	const allowed = /^(a|b|big|br|code|div|i|p|pre|li|ol|ul|span|sup|sub|tt)$/;
	return html.replace(
		(/<(\/?)(\w+)[^>]*?( href="(?!(javascript|data):)[^"]*?")?( title="[^"]*?")?[^>]*?>/g),
		(match, slash, tag, href, title) => allowed.test(tag) ? ('<'+ slash + tag + (title || '') + (href ? href +'target="_blank"' : '') +'>') : ''
	);
}
