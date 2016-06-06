const script = window.script = function(options)  { 'use strict';

const { nonce: token, } = options;

const log = (...args) => (console.log(...args), args.pop());

let context = null;

function randomizeCanvas(canvas, originals) {
	console.log('randomizeCanvas');
	const ctx = canvas.getContext('2d');
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // TODO: don't use getters
	const clone = originals.Node_p.cloneNode.call(canvas, true);
	clone.getContext('2d').putImageData(imageData, 0, 0);
	return clone;
}

function getRandomBytes(length) {
	const buffer = new ArrayBuffer(length);
	for (let offset = 0; offset < length; offset += 65536) {
		crypto.getRandomValues(new Uint8Array(buffer, offset, Math.min(length - offset, 65536)));
	}
	return new Uint8Array(buffer);
}

function randomizeUInt8Array(data) {
	const rnd = getRandomBytes(data.length);
	let w = 0, mask = 0;
	for (let i = 0, l = data.length; i < l; ++i) {
		w = data[i];
		mask = (1 << (32 - Math.clz32(w))) - 1 >>> 2; // TODO: this leaves deterministic bits
		data[i] = w ^ (mask & rnd[i]);
	}
	return data;
}

function randomizeTypedArray(array) {
	console.trace('not implemented');
	// TODO: manipulate values in array
	return array;
}

function createContext(options) {

	const randomFontFactor = (() => {
		const dispersion = options.fonts.dispersion / 100;
		const offset = 1 - dispersion;
		const factor = 2 * dispersion / (256 * 256);
		const rand = new Random(256 * 256);
		return () => offset + rand() * factor;
	})();

	const context = {
		values: options,

		token, log, notImplemented,
		fakes: new WeakMap,
		hiddenFunctions: new WeakMap,

		getOffsetSize(client, offset, element) {
			const correct = offset.call(element);
			if (!correct || client.call(element)) { return correct; }
			const factor = randomFontFactor();
			return correct === correct << 0 ? Math.round(correct * factor) : correct * factor;
		},

		randomizeCanvas, randomizeTypedArray, randomizeUInt8Array,
	};
	log('created context', context);
	return context;
}

function setContext(context) {
	window.addEventListener('getStopFingerprintingContext$'+ token, onGetStopFingerprintingContext);
	return context;
}

function getContext() {
	let context, root = window;
	try { do { /* jshint -W083 */
		root.dispatchEvent(new CustomEvent('getStopFingerprintingContext$'+ token, { detail: { return(c) { context = c; }, }, }));
	} while (!context && root.parent !== root && (root = root.parent)); } catch (e) { } /* jshint +W083 */
	context && console.log('found context', token, context);
	return context;
}

function onGetStopFingerprintingContext(event) {
	const { detail, } = event;
	event.detail.return(context);
}

class FakedAPIs {
	constructor(window, context) {
		this.context = context;
		this.window = window;
		this.originals = {
			Error_p: {
				constructor: window.Error,
				get_stack: exists(Object.getOwnPropertyDescriptor(window.Error.prototype, 'stack'), 'get'),
			},
			Function_p: {
				toString: window.Function.prototype.toString, // TODO: Function.prototype.toSource (firefox), Object.prototype.toString
			},
			Node_p: {
				cloneNode: window.Node.prototype.cloneNode,
			},
			Element_p: {
				get_clientWidth: Object.getOwnPropertyDescriptor(window.Element.prototype, 'clientWidth').get,
				get_clientHeight: Object.getOwnPropertyDescriptor(window.Element.prototype, 'clientHeight').get,
			},
			HTMLElement_p: {
				get_offsetWidth: Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetWidth').get,
				get_offsetHeight: Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetHeight').get,
			},
			HTMLIFrameElement_p: {
				get_contentDocument: Object.getOwnPropertyDescriptor(window.HTMLIFrameElement.prototype, 'contentDocument').get,
				get_contentWindow: Object.getOwnPropertyDescriptor(window.HTMLIFrameElement.prototype, 'contentWindow').get,
			},
			HTMLCanvasElement_p: {
				toDataURL: window.HTMLCanvasElement.prototype.toDataURL,
				toBlob: window.HTMLCanvasElement.prototype.toBlob,
				mozGetAsFile: window.HTMLCanvasElement.prototype.mozGetAsFile,
			},
			CanvasRenderingContext2D_p: {
				getImageData: window.CanvasRenderingContext2D.prototype.getImageData,
			},
			WebGLRenderingContext_p: {
				readPixels: window.WebGLRenderingContext.prototype.readPixels,
			},
		};
		this.fakeAPIs = fakeAPIs;
		this.build();
	}

	build() {
		this.apis = evaluateInWindow(this.window, this.context.values.nonce, this._build, this);
	}

	// executed in the target window itself
	_build() {
		'use strict';
		const _this = this;
		const { context, originals, fakeAPIs, window, } = this;
		const {
			Error_p, Function_p,
			HTMLIFrameElement_p,
			Node_p, Element_p, HTMLElement_p,
			HTMLCanvasElement_p, CanvasRenderingContext2D_p, WebGLRenderingContext_p,
		} = originals;
		const {
			hiddenFunctions,
			values, token,
			log, notImplemented,
			getOffsetSize,
			randomizeCanvas, randomizeTypedArray, randomizeUInt8Array,
		} = context;
		const apis = { };

		// fake function+'' => [native code]
		function hideCode(name, func) {
			if (typeof name === 'object') {
				const prop = Object.getOwnPropertyDescriptor(name, Object.keys(name)[0]);
				func = prop.get || prop.set;
				name = func.name;
			} else if (!func) {
				func = name;
				name = func.name;
			}
			hiddenFunctions.set(func, name || '');
			return func;
		}
		function hideAllCode(object) {
			// TODO: hide stack traces
			Object.keys(object).forEach(key => typeof object[key] === 'function' && hideCode(object[key]));
			return object;
		}
		apis['Function.prototype'] = {
			toString: { value: hideCode(function toString() {
				if (hiddenFunctions.has(this)) {
					return 'function '+ hiddenFunctions.get(this) +'() { [native code] }';
				}
				return Function_p.toString.call(this);
			}), },
		};
		// TODO: wrap mutation observer and mutation events to hide script injection

		// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
		apis['HTMLIFrameElement.prototype'] = {
			contentWindow: { get: hideCode(function() {
				const window = HTMLIFrameElement_p.get_contentWindow.call(this);
				if (window) { try {
					fakeAPIs(window);
				} catch (error) { console.error('fakeAPIs in get contentWindow failed', error); } }
				return window;
			}), },
			contentDocument: { get: hideCode(function() {
				const document = HTMLIFrameElement_p.get_contentDocument.call(this);
				if (document) { try {
					fakeAPIs(document.defaultView);
				} catch (error) { console.error('fakeAPIs in get contentDocument failed', error); } }
				return document;
			}), },
		};
		// TODO: window.frames

		// screen
		const screen = apis['Screen.prototype'] = { };
		Object.keys(values.screen)
		.forEach(prop => screen[prop] = { get: hideCode(function() { return values.screen[prop]; }), });
		apis.window = {
			devicePixelRatio: {
				get: hideCode({ get devicePixelRatio() { return values.screen.devicePixelRatio; }, }),
				set: hideCode({ set devicePixelRatio(v) { }, }),
			},
		};

		apis['MediaDevices.prototype'] = {
			enumerateDevices: { value: hideCode(function enumerateDevices() { return Promise.resolve([ ]); }), },
		};

		// navigator string values
		const navigator = apis['Navigator.prototype'] = { };
		Object.keys(values.navigator)
		.forEach(prop => navigator[prop] = { get: hideCode(function() { return values.navigator[prop]; }), enumerable: true, configurable: true, add: true, });
		Object.keys(values.navigator.undefinedValues)
		.forEach(prop => navigator[prop] = { delete: true, });
		delete navigator.undefinedValues;

		// navigator.plugins
		const PluginArray = apis.PluginArray = hideCode(function PluginArray() { throw new TypeError('Illegal constructor'); });
		Object.assign(PluginArray.prototype, hideAllCode({
			item() { return null; },
			namedItem() { return null; },
			refresh() { return; },
		}));
		Object.defineProperties(PluginArray.prototype, {
			length: { get: hideCode(function() { return 0; }), enumerable: true, configurable: true, },
			[Symbol.iterator]: { value: hideCode(function values() { return [][Symbol.iterator](); }), writable: true, enumerable: false, configurable: true, },
			[Symbol.toStringTag]: { value: 'PluginArray', writable: false, enumerable: false, configurable: true, },
		});
		const pluginArrayInstance = Object.create(PluginArray.prototype);
		navigator.plugins = { get: hideCode({ get plugins() { return pluginArrayInstance; }, }), };

		// navigator.mimeTypes
		const MimeTypeArray = apis.MimeTypeArray = hideCode(function MimeTypeArray() { throw new TypeError('Illegal constructor'); });
		Object.assign(MimeTypeArray.prototype, hideAllCode({
			item() { return null; },
			namedItem() { return null; },
		}));
		Object.defineProperties(MimeTypeArray.prototype, {
			length: { get: hideCode(function() { return 0; }), enumerable: true, configurable: true, },
			[Symbol.iterator]: { value: hideCode(function values() { return [][Symbol.iterator](); }), writable: true, enumerable: false, configurable: true, },
			[Symbol.toStringTag]: { value: 'MimeTypeArray', writable: false, enumerable: false, configurable: true, },
		});
		const mimeTypeArrayInstance = Object.create(MimeTypeArray.prototype);
		navigator.mimeTypes = { get: hideCode({ get mimeTypes() { return mimeTypeArrayInstance; }, }), };

		// navigator.sendBeacon
		navigator.sendBeacon = { value: hideCode(function sendBeacon(arg) {
			if (!arguments.length) { throw new window.TypeError('Not enough arguments to Navigator.sendBeacon.'); }
			return true;
		}), };

		// HTMLElement.offsetWidth/Height
		apis['HTMLElement.prototype'] = {
			offsetWidth: { get: hideCode({ get offsetWidth() {
				return getOffsetSize(Element_p.get_clientWidth, HTMLElement_p.get_offsetWidth, this);
			}, }), },
			offsetHeight: { get: hideCode({ get offsetHeight() {
				return getOffsetSize(Element_p.get_clientHeight, HTMLElement_p.get_offsetHeight, this);
			}, }), },
		};

		// HTMLCanvasElement
		const canvas = apis['HTMLCanvasElement.prototype'] = { };
		[ 'toDataURL', 'toBlob', 'mozGetAsFile', ]
		.forEach(prop => canvas[prop] = { value: hideCode(prop, function() { log('HTMLCanvasElement.prototype.', prop); return HTMLCanvasElement_p[prop].apply(randomizeCanvas(this, originals), arguments); }), });
		apis['CanvasRenderingContext2D.prototype'] = {
			getImageData: { value: hideCode(function getImageData(a, b, c, d) {
				const data = CanvasRenderingContext2D_p.getImageData.apply(this, arguments);
				randomizeUInt8Array(data.data);
				return data;
			}), },
		};
		apis['WebGLRenderingContext.prototype'] = {
			readPixels: { value: hideCode(function readPixels(a, b, c, d, e, f, data) {
				WebGLRenderingContext_p.readPixels.apply(this, arguments);
				randomizeTypedArray(data);
			}), },
		};

		return apis;
	}

	apply() {
		const { window, apis, } = this;

		Object.keys(apis).forEach(key => {
			const target = key.split('.').reduce((object, key) => object[key], window);
			setProps(target, apis[key]);
		});
	}
}

function setProps(object, props) {
	Object.keys(props).forEach(key => {
		const prop = props[key];
		if (!prop.add && !object.hasOwnProperty(key)) { return; }
		if (prop.delete) { return delete object[key]; }
		Object.defineProperty(object, key, prop);
	});
	return object;
}

function fakeAPIs(window) {
	const host = window.frameElement;
	if (host && (/^data:/).test(host.src)) {
		console.log('Redirecting frame with "data:" src to about:blank', host);
		const { parentNode, nextSibling, } = host;
		host.remove();
		host.src = 'about:blank';
		parentNode.insertBefore(host, nextSibling);
		return;
	}

	let fake = context.fakes.get(window);
	if (!fake) {
		fake = new FakedAPIs(window, context);
		context.fakes.set(window, fake);
		console.log('fake.build', host);
	}
	fake.apply(); // TODO: find a better solution
	// console.log('fake.apply', host);
}

function attachObserver() {
	const observer = new MutationObserver(mutations => mutations.forEach(({ addedNodes, }) => Array.prototype.forEach.call(addedNodes, element => {
		if (element.tagName === 'IFRAME') {
			// console.log('direct: attaching to iframe', element);
			fakeAPIs(element.contentWindow, element);
		} else if(element.querySelector && element.querySelector('iframe')) {
			Array.prototype.forEach.call(element.querySelectorAll('iframe'), element => { try {
				// console.log('loop: attaching to iframe', element);
				fakeAPIs(element.contentWindow, element);
			} catch(error) { console.error(error); } });
		}
	})));
	observer.observe(document, { subtree: true, childList: true, });
}

/**
 * Returns a function that returns pseudo randoms without calling Math.random() each time for small numbers.
 * @param {number}  n  Exclusive upper bound of the randoms. (0 <= random < n)
 */
function Random(n) { // TODO: test
	const shift = Math.ceil(Math.log2(n));
	const factor = n / Math.pow(2, shift);
	const mask = (1 << shift) - 1;

	let index = Infinity, buffer = [ ];

	function get() {
		index = 0;
		let random = Math.random() * Number.MAX_SAFE_INTEGER << 0;
		for (let i = shift, j = 0; i < 32; i += shift, ++j) {
			buffer[j] = ((random & mask) * factor) << 0;
			random = random >> shift;
		}
	}

	return function() {
		if (index >= buffer.length) { get(); }
		return buffer[index++];
	};
}

function exists(obj, ...keys) {
	return keys.reduce((obj, key) => obj && obj[key], obj);
}

function notImplemented() {
	throw new Error('not implemented');
}

function evaluateInWindow(window, nonce, script, thisArg, ...args) {
	return script.apply(thisArg, args);
}

function evaluateInWindow_real(window, nonce, script, thisArg, ...args) {
	const { document, } = window;
	const element = document.createElement('script');
	element.async = false;
	element.setAttribute('nonce', nonce);
	element.textContent =
	(`function inject({ detail, }) { try { const script = (function ${ (script +'').replace(/^(function )?/, '') });
		window.removeEventListener('inject', inject);
		console.log('detail', detail);
		detail.return(script.apply(detail.thisArg, detail.args));
	} catch (error) {
		detail.throw(error);
	} }; window.addEventListener('inject', inject);`);
	document.documentElement.appendChild(element).remove();
	let value, error, hasThrown, hasReturned;
	window.dispatchEvent(new CustomEvent('inject', { detail: {
		return(v) { value = v; hasReturned = true; },
		throw(e) { error = e; hasThrown = true; },
		thisArg, args,
	}, }));
	if (hasThrown) { throw error; }
	if (!hasReturned) { throw new Error('Failed to evaluate function'); }
	return value;
}

return (function main() {
	context = getContext();
	!context && (context = setContext(createContext(options)));
	fakeAPIs(window);
	attachObserver();
})();

};
