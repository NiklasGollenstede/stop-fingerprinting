(function() { 'use strict'; /* global script */

const token = window.token = (() => { try { return window.parent.token; } catch (e) { } })() || generateToken();
const url = location.href;

let element;
(() => { try {
	const { getOptions, } = inject(script, { token, });
	if (!getOptions) { return console.log('attached to context', window); }

	chrome.runtime.sendMessage({ name: 'getOptionsForUrl', args : [ url, ], }, ({ error, value, }) => {
		if (error) { throw parseError(error); }
		console.log('loaded options', url, value);
		inject((token, options) => {
			window.dispatchEvent(new CustomEvent('stopFingerprintingOptionsLoaded$'+ token, { detail: { options, }, }));
		}, token, value);
		console.log('attached to context', window);
	});

} catch(error) {
	alert('Failed to inject Stop Fingerprinting script: "'+ (error && error.message || 'unknown error') +'"!');
	throw error;
} })();

function generateToken() {
	const token = Array.prototype.map.call(window.crypto.getRandomValues(new Uint32Array(6)), r => r.toString(36)).join('');
	console.log('generated token', token);
	return token;
}

function inject(script, ...args) {
	const { document, } = this || window;
	const element = document.createElement('script');
	element.async = false;
	element.id = 'injector';
	element.textContent =
	(`(function () { try { const script = (${ script });
		const args = JSON.parse(\`${ JSON.stringify(args) }\`);
		const value = script.apply(null, args);
		this.dataset.done = true;
		this.dataset.value = JSON.stringify(value) || 'null';
	} catch (error) {
		console.error(error);
		this.dataset.error = JSON.stringify(
			typeof error !== 'object' || error === null || !(error instanceof Error) ? error
			: { name: error.name, message: error.message, stack: error.stack, }
		);
	} }).call(document.querySelector('script#injector'));`);
	document.documentElement.appendChild(element).remove();
	if (element.dataset.error) {
		const error = JSON.parse(element.dataset.error);
		const constructor = window[error && error.name] || Error;
		throw Object.assign(new constructor, error);
	}
	if (!element.dataset.done) { throw new Error('Script was not executed at all'); }
	return JSON.parse(element.dataset.value);
}

function parseError(string) {
	if (typeof string !== 'string') { return string; }
	return JSON.parse(string, (key, value) => {
		if (!value || typeof value !== 'string' || !value.startsWith('$_ERROR_$')) { return value; }
		const object = JSON.parse(value.slice(9));
		const constructor = object.name ? window[object.name] || Error : Error;
		return Object.assign(new constructor, object);
	});
}

})();
