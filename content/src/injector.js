/* globals
 injectedSource, injectedSourceMap,
 window, self, document,
 XMLHttpRequest, chrome, console
*/
main: {

let root = window, url; try { do {
	url = root.location.href;
} while (root.parent !== root && root.parent.location.href && (root = root.parent)); } catch (e) { }

const echoPorts = [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ];

for (let i = 0, errors = [ ]; i < echoPorts.length; ++i) { try {

	const request = new XMLHttpRequest();
	request.open('GET', `https://localhost:${ echoPorts[i] }/stop_fingerprint_get_options`, false); // sync
	try { request.send(null); }
	catch (error) { errors.push(error); if (i === echoPorts.length - 1) { console.error(errors); throw errors[0]; } continue; } // try next port

	const { response, } = request;

	console.log('response', response);

	const nonce = (/^[^;]*/).exec(response)[0];
	const json = response.slice(nonce.length + 1);
	if (json === 'false') { console.log('Spoofing is disabled for ', url, window); break main; }

	window.addEventListener('stopFingerprintingPostMessage$'+ nonce, ({ detail: message, }) => {
		message.post = true;
		chrome.runtime.sendMessage(message);
	});

	injectedSourceMap.sourceRoot = applyingSourceMap.sourceRoot = getCallingScript().replace(/[^\/]*?$/, '');
	const code0 = injectedSource +`\n\n//# sourceMappingURL=data:application/json;base64,`+ btoa(JSON.stringify(injectedSourceMap));
	const code1 = applyingSource +`\n\n//# sourceMappingURL=data:application/json;base64,`+ btoa(JSON.stringify(applyingSourceMap));

	inject(nonce, code0, code1, json);
	break;
} catch (error) {
	if (root === self) {
		reportError(error, 'error');
		if (confirm('Critical error, cancel navigation?')) {
			document.documentElement && document.documentElement.remove();
			window.stop();
		}
	} else {
		reportError(error, 'debug');
	}
	throw error;
} }

function inject(nonce, script, sArg0, sArg1) {
	const element = document.createElement('script');
	element.setAttribute('nonce', nonce);
	element.textContent = script;
	element.dataset.arg0 = sArg0;
	element.dataset.arg1 = sArg1;
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
}

function getCallingScript() {
	const stack = (new Error).stack.split(/$/m);
	const line = stack[(/^Error/).test(stack[0]) + 1];
	const parts = line.split(/(?:\@|\(|\ )/g);
	return parts[parts.length - 1].replace(/\:\d+(?:\:\d+)\)?$/, '');
}

}
