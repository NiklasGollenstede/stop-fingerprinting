'use strict';

const xhr = new XMLHttpRequest; xhr.open('get', '/package.json', true); xhr.send();
xhr.onload = ({ target: { response: json, }, }) => main(JSON.parse(json), chrome.runtime.getManifest());

function main(_package, manifest) {

	set('title', manifest.name);
	set('version', manifest.version);
	set('license', manifest.license);
	set('author', manifest.author);
	set('repo', 'href', _package.repository.url.replace(':', '/').replace(/^git@/, 'https://'));

}

function set(key, attr, value) {
	value = arguments[arguments.length - 1];
	attr = arguments.length > 2 && attr;
	const element = document.querySelector('#'+ key);
	element && (element[attr || 'textContent'] = value);
}
