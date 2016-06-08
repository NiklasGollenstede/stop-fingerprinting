const script = window.script = function(options)  { 'use strict';

const context = (() => {
	const token = options.nonce;

	// search for existing context
	let context, root = window;
	try { do { /* jshint -W083 */
		root.dispatchEvent(new CustomEvent('getStopFingerprintingContext$'+ token, { detail: { return(c) { context = c; }, }, }));
	} while (!context && root.parent !== root && (root = root.parent)); } catch (e) { } /* jshint +W083 */
	context && console.log('found context', token, context);
	if (context) { return context; }

	// create context
	context = {
		values: options, options,

		log, notImplemented,
		fakes: new WeakMap, fakeAPIs,
		hiddenFunctions: new WeakMap,

		originals: {
			Error_p: {
				constructor: window.Error,
				get_stack: exists(Object.getOwnPropertyDescriptor(window.Error.prototype, 'stack'), 'get'),
			},
			Function_p: {
				constructor: window.Function,
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
			setTimeout: window.setTimeout, setInterval: window.setInterval, setImmediate: window.setImmediate,
		},

		// Element.offsetWith/Height randomization
		getOffsetSize(client, offset, element) {
			const correct = offset.call(element);
			if (!correct || client.call(element)) { return correct; }
			const factor = this.randomFontFactor();
			return correct === correct << 0 ? Math.round(correct * factor) : correct * factor;
		},
		randomFontFactor: (() => {
			const dispersion = options.fonts.dispersion / 100;
			const offset = 1 - dispersion;
			const factor = 2 * dispersion / (256 * 256);
			const rand = new Random(256 * 256);
			return () => offset + rand() * factor;
		})(),

		// <canvas> randomization
		randomizeCanvas(canvas, originals) {
			console.log('randomizeCanvas');
			const ctx = canvas.getContext('2d');
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // TODO: don't use getters
			const clone = originals.Node_p.cloneNode.call(canvas, true);
			clone.getContext('2d').putImageData(imageData, 0, 0);
			return clone;
		},
		getRandomBytes(length) {
			const buffer = new ArrayBuffer(length);
			for (let offset = 0; offset < length; offset += 65536) {
				crypto.getRandomValues(new Uint8Array(buffer, offset, Math.min(length - offset, 65536)));
			}
			return new Uint8Array(buffer);
		},
		randomizeUInt8Array(data) {
			const rnd = this.getRandomBytes(data.length);
			let w = 0, mask = 0;
			for (let i = 0, l = data.length; i < l; ++i) {
				w = data[i];
				mask = (1 << (32 - Math.clz32(w))) - 1 >>> 2; // TODO: this leaves deterministic bits
				data[i] = w ^ (mask & rnd[i]);
			}
			return data;
		},
		randomizeTypedArray(array) {
			console.trace('not implemented');
			// TODO: manipulate values in array
			return array;
		},
	};
	Object.keys(context).forEach(key => typeof context[key] === 'function' && (context[key] = context[key].bind(context)));
	log('created context', context);

	// 'save' context
	window.addEventListener('getStopFingerprintingContext$'+ token, event => event.detail.return(context));

	return context;
})();


class FakedAPIs {
	constructor(window) {
		this.window = window;
		this.build();
	}

	build() {
		this.apis = new context.originals.Function_p.constructor('context', `
			const { ${ Object.keys(context).join(', ') }, } = context;
			const { ${ Object.keys(context.originals).join(', ') }, } = context.originals;
			return (function ${ (this._build +'').replace(/^(function )?/, '') }).call(this);
		`).call(this, context);
	}

	// executed in the target window itself with context and context.originals expanded in the surrounding scope
	_build() {
		const apis = { };

		function define(name, object) {
			const current = apis[name] || { };
			if (typeof object === 'function') { object = object(current); }
			return (apis[name] = Object.assign(current, object));
		}

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
			options.debug && (func.isFaked = true);
			return func;
		}
		function hideAllCode(object) {
			Object.keys(object).forEach(key => typeof object[key] === 'function' && hideCode(object[key]));
			return object;
		}
		define('Function.prototype', {
			toString: { value: hideCode(function toString() {
				if (hiddenFunctions.has(this)) {
					return 'function '+ hiddenFunctions.get(this) +'() { [native code] }';
				}
				return Function_p.toString.call(this);
			}), },
		});
		// TODO: hide stack traces
		// TODO: wrap mutation observer and mutation events to hide script injection

		// disable CSPs 'unsafe-eval' if it was inserted by the background scripts
		if (values.misc.disableEval) {
			const Function = hideCode(function Function(x) { throw new Error('call to Function() blocked by CSP'); });
			define('Function.prototype', {
				constructor: { value: Function, },
			});
			define('window', {
				Function: { value: Function, },
				eval: { value: hideCode('eval', function(x) { throw new Error('call to eval() blocked by CSP'); }), },
				setTimeout: { value: hideCode(function setTimeout(x) { return typeof x === 'function' ? setTimeout.apply(this, arguments) : 0; }), },
				setInterval: { value: hideCode(function setInterval(x) { return typeof x === 'function' ? setInterval.apply(this, arguments) : 0; }), },
				setImmediate: { value: hideCode(function setImmediate(x) { return typeof x === 'function' ? setImmediate.apply(this, arguments) : 0; }), },
			}); // TODO: any more?
		}

		// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
		define('HTMLIFrameElement.prototype', {
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
		});
		// TODO: window.frames

		// screen
		define('Screen.prototype', screen => Object.keys(values.screen).forEach(
			prop => screen[prop] = { get: hideCode(function() { return values.screen[prop]; }), }
		));
		define('window', {
			devicePixelRatio: {
				get: hideCode({ get devicePixelRatio() { return values.screen.devicePixelRatio; }, }),
				set: hideCode({ set devicePixelRatio(v) { }, }),
			},
		});

		define('MediaDevices.prototype', {
			enumerateDevices: { value: hideCode(function enumerateDevices() { return Promise.resolve([ ]); }), },
		});

		// navigator string values
		const navigator = define('Navigator.prototype', { });
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
		define('HTMLElement.prototype', {
			offsetWidth: { get: hideCode({ get offsetWidth() {
				return getOffsetSize(Element_p.get_clientWidth, HTMLElement_p.get_offsetWidth, this);
			}, }), },
			offsetHeight: { get: hideCode({ get offsetHeight() {
				return getOffsetSize(Element_p.get_clientHeight, HTMLElement_p.get_offsetHeight, this);
			}, }), },
		});

		// HTMLCanvasElement
		const canvas = define('HTMLCanvasElement.prototype', { });
		[ 'toDataURL', 'toBlob', 'mozGetAsFile', ]
		.forEach(prop => canvas[prop] = { value: hideCode(prop, function() { log('HTMLCanvasElement.prototype.', prop); return HTMLCanvasElement_p[prop].apply(randomizeCanvas(this, originals), arguments); }), });
		define('CanvasRenderingContext2D.prototype', {
			getImageData: { value: hideCode(function getImageData(a, b, c, d) {
				const data = CanvasRenderingContext2D_p.getImageData.apply(this, arguments);
				randomizeUInt8Array(data.data);
				return data;
			}), },
		});
		define('WebGLRenderingContext.prototype', {
			readPixels: { value: hideCode(function readPixels(a, b, c, d, e, f, data) {
				WebGLRenderingContext_p.readPixels.apply(this, arguments);
				randomizeTypedArray(data);
			}), },
		});

		return apis;
	}

	apply() {
		const { window, apis, } = this;

		Object.keys(apis).forEach(key => {
			const target = key.split('.').reduce((object, key) => object[key], window);
			setProps(target, apis[key]);
		});

		if (options.debug) {
			window.applyCount = (window.applyCount || 0) + 1;
			window.context = context;
		}
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
		fake = new FakedAPIs(window);
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

function log() {
	console.log.apply(console, arguments); return arguments[arguments.length - 1];
}

return (function main() {
	fakeAPIs(window);
	attachObserver();
})();

};
