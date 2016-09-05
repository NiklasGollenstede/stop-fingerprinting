(function() { 'use strict'; /* global script */ // license: MPL-2.0

let root = window, url; try { do {
	url = root.location.href;
} while (root.parent !== root && root.parent.location.href && (root = root.parent)); } catch (e) { }

const echoPorts = [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ];

for (let i = 0; i < echoPorts.length; ++i) { try {

	const request = new XMLHttpRequest();
	request.open('GET', `https://localhost:${ echoPorts[i] }/stop_fingerprint_get_options`, false); // sync
	try { request.send(null); }
	catch (error) { if (i === echoPorts.length - 1) { throw error; } continue; } // try next port

	const { response, } = request;

	console.log('response', response);

	const nonce = (/^[^;]*/).exec(response)[0];
	const json = response.slice(nonce.length + 1);
	if (json === 'false') { return console.log('Spoofing is disabled for ', url, window); }

	window.addEventListener('stopFingerprintingPostMessage$'+ nonce, ({ detail: message, }) => {
		message.post = true;
		chrome.runtime.sendMessage(message);
	});

	inject(nonce, script, json);
	break;
} catch (error) {
	if (root === self) {
		document.documentElement && document.documentElement.remove();
		window.stop();
		reportError(error, 'error');
	} else {
		reportError(error, 'debug');
	}
} }

function inject(nonce, script, jsonArg) {
	const element = document.createElement('script');
	element.setAttribute('nonce', nonce);
	element.textContent =
	(`(function () { try {
		// throw new Error('nope');
		const script = (${ script });
		const arg = JSON.parse(\`${ jsonArg }\`);
		const value = script.call(window, arg, script);
		this.dataset.done = true;
		this.dataset.value = JSON.stringify(value) || 'null';
	} catch (error) {
		console.error(error);
		this.dataset.error = JSON.stringify(error, (key, value) => {
			if (!value || typeof value !== 'object') { return value; }
			if (value instanceof Error) { return '$_ERROR_$'+ JSON.stringify({ name: value.name, message: value.message, stack: value.stack, }); }
			return value;
		});
	} }).call(document.currentScript)`);
	document.documentElement.appendChild(element).remove();
	if (element.dataset.error) { throw parseError(element.dataset.error); }
	if (!element.dataset.done) { throw new Error('Script was not executed at all'); }
	return JSON.parse(element.dataset.value);
}

function parseError(string) {
	if (typeof string !== 'string') { return string; }
	return JSON.parse(string, (key, value) => {
		if (!value || typeof value !== 'string' || !value.startsWith('$_ERROR_$')) { return value; }
		const object = JSON.parse(value.slice(9));
		const Constructor = object.name ? window[object.name] || Error : Error;
		const error = Object.create(Constructor.prototype);
		Object.assign(error, object);
		return error;
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
