(function() { 'use strict'; /* global script */

const token = window.token = (() => { try { return window.parent.token; } catch (e) { } })() || generateToken();
const url = location.href;

let element;
(() => { try {
	const { getOptions, } = inject(script, { token, });
	if (!getOptions) { return console.log('attached to context', window); }

	chrome.runtime.sendMessage({ name: 'getOptionsForUrl', args : [ url, ], }, ({ error, value, }) => {
		if (error) { throw error; }
		if (!value) { return console.log('skiping ', url); }
		inject((token, options) => {
			window.dispatchEvent(new CustomEvent('stopFingerprintingOptionsLoaded', { detail: { token, options, }, }));
		}, token, value);
		console.log('attached to context', window);
	});

} catch(error) {
	alert('Failed to inject Stop Fingerprinting script: "'+ (error && error.message || 'unknown error') +'"!');
	throw error;
} })();

function generateToken() {
	const token = Math.random().toString(36).slice(2); // + Math.random().toString(36).slice(2);
	console.log('generated token', token);
	return token;
}

function inject(script, ...args) {
	const element = document.createElement('div');
	element.setAttribute('onclick', `
		try {
			const args = JSON.parse(\`${ JSON.stringify(args) }\`);
			const value = (
			${ script }
			).apply(null, args);
			this.dataset.done = true;
			this.dataset.value = JSON.stringify(value) || 'null';
		} catch (error) {
			console.error(error);
			this.dataset.error = JSON.stringify(
				typeof error !== 'object' || error === null || !(error instanceof Error) ? error
				: { name: error.name, message: error.message, stack: error.stack, }
			);
		}
	`);
	element.click();
	if (element.dataset.error) {
		const error = JSON.parse(element.dataset.error);
		const constructor = window[error && error.name] || Error;
		throw Object.assign(new constructor, error);
	}
	if (!element.dataset.done) { throw new Error('Script was not executed at all'); }
	return JSON.parse(element.dataset.value);
}

})();
