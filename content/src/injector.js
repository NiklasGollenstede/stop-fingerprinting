/* globals
	injectedSource, injectedSourceMap,
	applyingSourceMap, applyingSource,
	self,
*/

const { btoa, confirm, Error, XMLHttpRequest, chrome, console, Object, JSON, } = self;
const { create, assign, } = Object;
const { stringify, parse, } = JSON;

let root = self, url; try { do {
	url = root.location.href;
} while (root.parent !== root && root.parent.location.href && (root = root.parent)); } catch (e) { }

const echoPorts = [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ];

try {

	let request;
	for (let i = 0, errors = [ ]; i < echoPorts.length; ++i) {
		request = new XMLHttpRequest();
		request.open('GET', `https://localhost:${ echoPorts[i] }/stop_fingerprint_get_options`, false); // sync
		try { request.send(null); }
		catch (error) { errors.push(error); if (i === echoPorts.length - 1) { console.error(errors); throw errors[0]; } continue; } // try next port
		break;
	}
	const { response, } = request;

	const nonce = (/^[^;]*/).exec(response)[0];
	const jsonOptions = response.slice(nonce.length + 1);
	if (jsonOptions === 'false') { console.log('Spoofing is disabled for ', self); break file; }

	self.addEventListener('stopFingerprintingPostMessage$'+ nonce, ({ detail: message, }) => {
		message.post = true;
		chrome.runtime.sendMessage(message);
	});

	injectedSourceMap.sourceRoot = applyingSourceMap.sourceRoot = getCallingScript().replace(/[^\/]*?$/, '');

	inject({
		window: self,
		nonce,
		injectedSource: injectedSource +`\n\n//# sourceMappingURL=data:application/json;base64,`+ btoa(stringify(injectedSourceMap)),
		applyingSource: applyingSource +`\n\n//# sourceMappingURL=data:application/json;base64,`+ btoa(stringify(applyingSourceMap)),
		jsonOptions,
	});

} catch (error) {
	if (root === self) {
		reportError(error, 'error');
		if (confirm('Critical error, cancel navigation?')) {
			self.document.documentElement && self.document.documentElement.remove();
			self.stop();
		}
	} else {
		reportError(error, 'debug');
	}
	throw error;
}

function inject({ window, nonce, injectedSource, applyingSource, jsonOptions, }) {
	console.log('inject frame', window.frameElement);
	let sandbox = window.frameElement && window.frameElement.getAttribute('sandbox');
	if (sandbox) {
		console.log('sandboxed');
		window.frameElement.setAttribute('sandbox', sandbox.replace(/(^| )allow-scripts( |$)|$/, s => s || ' allow-scripts'));
	}

	const element = window.document.createElement('script');
	element.setAttribute('nonce', nonce);
	element.dataset.jsonOptions = jsonOptions;
	element.dataset.injectedSource = injectedSource;
	element.dataset.applyingSource = applyingSource;
	element.textContent = (`
		(function () { try {
			const options = JSON.parse(this.dataset.jsonOptions);
			const injectedSource = this.dataset.injectedSource;
			const applyingSource = this.dataset.applyingSource;
			const value = new Function(injectedSource).call(window, options, injectedSource, applyingSource);
			this.dataset.value = JSON.stringify(value) || 'null';
			this.dataset.done = true;
		} catch (error) {
			try {
				this.dataset.error = JSON.stringify(error, (key, value) => {
					if (!value || typeof value !== 'object') { return value; }
					if (value instanceof Error) { return '$_ERROR_$'+ JSON.stringify({ name: value.name, message: value.message, stack: value.stack, }); }
					return value;
				});
			} catch (_) { }
			throw error;
		} }).call(document.currentScript)
	`);
	window.document.documentElement.appendChild(element).remove();
	sandbox && window.frameElement.setAttribute('sandbox', sandbox);
	if (element.dataset.error) { throw parseError(element.dataset.error); }
	if (!element.dataset.done) {
		throw new Error('Script was not executed at all');
	}
	return parse(element.dataset.value);
}

function parseError(string) {
	if (typeof string !== 'string') { return string; }
	return parse(string, (key, value) => {
		if (!value || typeof value !== 'string' || !value.startsWith('$_ERROR_$')) { return value; }
		const object = parse(value.slice(9));
		const Constructor = object.name ? self[object.name] || Error : Error;
		const error = create(Constructor.prototype);
		assign(error, object);
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
		}, ],
	});
}

function getCallingScript() {
	const stack = (new Error).stack.split(/$/m);
	const line = stack[(/^Error/).test(stack[0]) + 1];
	const parts = line.split(/(?:\@|\(|\ )/g);
	return parts[parts.length - 1].replace(/\:\d+(?:\:\d+)?\)?$/, '');
}
