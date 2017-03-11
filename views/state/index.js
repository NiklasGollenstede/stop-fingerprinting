(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/dom': { createElement, },
	'node_modules/web-ext-utils/browser/version': { current: currentBrowser, },
	'./features': { features, featureStates, },
	require,
}) => ({ document, }) => {

document.head.appendChild(createElement('link', { rel: 'stylesheet', href: require.toUrl(`./index.css`), }));

document.body.insertAdjacentHTML('beforeend', `
	<div>
		<h1 id="title">Work in progress</h1>
		<h3 id="title">This extension is still under heavy development</h3>
	</div>
	<br>
	<div>
		<table><tbody id="status">
			<tr> <th>Feature</th> <th>State</th> <th>Note</th> </tr>
		</tbody></table>
	</div>
`);

const table = document.querySelector('#status');

Object.keys(features).forEach(section => {
	table.appendChild(createSection(features[section]));
	const { entries, } = features[section];
	Object.keys(entries).forEach(key => {
		table.appendChild(createRow(entries[key]));
	});
});

function createRow({ title, description, state, }) {
	state = state[currentBrowser] || state.all;
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

function sanatize(html) {
	const allowed = /^(a|b|big|br|code|div|i|p|pre|li|ol|ul|span|sup|sub|tt)$/;
	return html.replace(
		(/<(\/?)(\w+)[^>]*?( href="(?!(javascript|data):)[^"]*?")?( title="[^"]*?")?[^>]*?>/g),
		(match, slash, tag, href, title) => allowed.test(tag) ? ('<'+ slash + tag + (title || '') + (href ? href +'target="_blank"' : '') +'>') : ''
	);
}

}); })(this);
