(function() { 'use strict'; /* global script */ // license: MPL-2.0

let root = window, url; try { do {
	url = root.location.href;
} while (root.parent !== root && root.parent.location.href && (root = root.parent)); } catch (e) { }

getOptions(({ options: json, nonce, }) => {
	if (json === 'false') { return console.log('Spoofing is disabled for ', url, window); }

	window.addEventListener('stopFingerprintingPostMessage$'+ nonce, ({ detail: message, }) => {
		message.post = true;
		chrome.runtime.sendMessage(message);
	});

	inject(nonce, script, json);
});

function getOptions(callback) {
	if (root.options) { return void callback(root.options); }

	chrome.runtime.sendMessage({ name: 'getOptionsForUrl', args : [ url, ], }, arg => {
		if ('error' in arg) { reportError(parseError(arg.error)); }
		callback(root.options = arg.value);
	});
}

function inject(nonce, script, jsonArg) {
	const element = document.createElement('script');
	element.async = false;
	element.id = 'injector';
	element.setAttribute('nonce', nonce);
	element.textContent =
	(`(function () { try {
		const script = (${ script });
		const arg = JSON.parse(\`${ jsonArg }\`);
		const value = script.call(window, arg, script);
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
		reportError(Object.assign(new constructor, error));
	}
	if (!element.dataset.done) { reportError(new Error('Script was not executed at all'), 'debug'); }
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

function reportError(error, level = 'error') {
	chrome.runtime.sendMessage({
		post: true,
		name: 'notify',
		args: [ level, {
			title: 'Unexpected exception',
			message: error && error.message || error,
			url,
		}, ],
	});
	throw error;
}

})();
