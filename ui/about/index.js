'use strict';

main(window.chrome.runtime.getManifest());

function main(manifest) {

	set('title', manifest.name);
	set('version', manifest.version);
	set('license', manifest.license);
	set('author', manifest.author);
	set('repo', 'href', manifest.repository.url);

}

function set(key, attr, value) {
	value = arguments[arguments.length - 1];
	attr = arguments.length > 2 ? attr : 'textContent';
	const element = document.querySelector('#'+ key);
	element && (element[attr] = value);
}
