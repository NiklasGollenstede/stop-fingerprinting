(function() { 'use strict'; /* global script */

let root = window, url; try { do {
	url = root.location.href;
} while (root.parent !== root && (root = root.parent) && root.location.href); } catch (e) { }

getOptions(({ options, nonce, }) => {
	if (options === 'false') { return console.log('Spoofing is disabled for ', url, window); }

	inject(nonce, script, options);
});

function getOptions(callback) {
	if (root.options) { return void callback(root.options); }

	chrome.runtime.sendMessage({ name: 'getOptionsForUrl', args : [ url, ], }, ({ error, value, }) => {
		if (error) { throw parseError(error); }
		root.options = value;
		console.log('loaded options', value);
		callback(value);
	});
}

function inject(nonce, script, jsonArg) {
	const { document, } = this || window;
	const element = document.createElement('script');
	element.async = false;
	element.id = 'injector';
	element.setAttribute('nonce', nonce);
	element.textContent =
	(`(function () { try { const script = (${ script });
		const arg = JSON.parse(\`${ jsonArg }\`);
		const value = script.call(null, arg);
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
