'use strict'; /* global script */

const token = window.token = (() => { try { return window.parent.token; } catch (e) { } })() || generateToken();

const url = location.href;
chrome.runtime.sendMessage({ name: 'getOptionsForUrl', args : [ url, ], }, ({ error, value, }) => {
	if (error) { throw error; }
	if (!value) { return console.log('skiping ', url); }
	inject(script);
});

function inject(script, token = window.token) {
	let element;
	try {
		element = document.createElement('div');
		element.setAttribute('onclick', '('+ script +').call(this, '+ JSON.stringify({ token, }) +')');
		element.click();
		if (element.dataset.error) {
			const error = JSON.parse(element.dataset.error);
			const constructor = window[error && error.name] || Error;
			throw Object.assign(new constructor(error && error.message), error);
		}
		if (!element.dataset.done) { throw new Error('Script was not executed at all'); }
		console.log('attached to context', window);
	} catch(error) {
		alert('Failed to inject Stop Fingerprinting script: "'+ (error && error.message || 'unknown error') +'"!');
		throw error;
	}
	return token;
}

function generateToken() {
	const token = Math.random().toString(36).slice(2); // + Math.random().toString(36).slice(2);
	console.log('generated token', token);
	return token;
}

