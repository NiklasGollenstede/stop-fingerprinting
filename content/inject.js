const script = window.script = function(options, script)  { 'use strict';

const self = this;
const window = self.constructor.name === 'Window' ? self : null;
const worker = window ? null : self;

const {
	Math, Math: {
		clz32,
		random,
		round,
		min,
		max, },
	CustomEvent,
	dispatchEvent,
	Object, Object: {
		keys,
		create,
		assign,
		getOwnPropertyDescriptor,
		defineProperty,
		defineProperties,
		getPrototypeOf, },
	Array,
	Function,
	ArrayBuffer,
	Uint8Array,
	Promise,
	Symbol, Symbol: {
		iterator,
		toStringTag, },
	Reflect, Reflect: {
		apply, },
	Blob,
	URL, URL: {
		createObjectURL,
		revokeObjectURL, },
} = self;

const _call          =            Function .prototype.call;
const call           = _call.bind(Function .prototype.call);
const bind           = _call.bind(Function .prototype.bind);
const forEach        = _call.bind(Array    .prototype.forEach);
const reduce         = _call.bind(Array    .prototype.reduce);
const join           = _call.bind(Array    .prototype.join);
const split          = _call.bind(String   .prototype.split);
const replace        = _call.bind(String   .prototype.replace);
const weakMapSet     = _call.bind(WeakMap  .prototype.set);
const weakMapGet     = _call.bind(WeakMap  .prototype.get);
const weakMapHas     = _call.bind(WeakMap  .prototype.has);
const hasOwnProperty = _call.bind(Object   .prototype.hasOwnProperty);

const console = (console => {
	const clone = { };
	forEach([ 'log', 'trace', 'error', 'info', ], key => clone[key] = bind(console[key], console));
	return clone;
})(self.console);

const getRandomValues      =           crypto.getRandomValues.bind(crypto);
const typedArrayGetLength  =           _call.bind(getGetter(getPrototypeOf(Uint8Array.prototype), 'length'));
const imageDataGetData     =           _call.bind(getGetter(ImageData          .prototype, 'data'));
const canvasGetWidth       = window && _call.bind(getGetter(HTMLCanvasElement  .prototype, 'width'));
const canvasGetHeight      = window && _call.bind(getGetter(HTMLCanvasElement  .prototype, 'height'));
const customEventGetDetail =           _call.bind(getGetter(CustomEvent        .prototype, 'detail'));

const context = (() => {
	const token = options.nonce;
	let context;

	// search for existing context
	if (window) {
		let root = window;
		try { do { /* jshint -W083 */
			call(dispatchEvent, root, new CustomEvent('getStopFingerprintingContext$'+ token, { detail: { return(c) { context = c; }, }, }));
		} while (!context && root.parent !== root && (root = root.parent)); } catch (e) { } /* jshint +W083 */
		context && console.log('found context', token, context);
		if (context) { return context; }
	}


	// create context
	context = {
		values: options, options, script, top: self,

		// all 'globals' from above here too
		Math, clz32, random, round, min, max, CustomEvent, dispatchEvent, Object, keys, create, assign, getOwnPropertyDescriptor, defineProperty, defineProperties, getPrototypeOf, Array, Function, ArrayBuffer, Uint8Array, Promise, Symbol, iterator, toStringTag, Reflect, apply, Blob, URL, createObjectURL, revokeObjectURL,
		call, bind, forEach, reduce, join, split, replace, weakMapSet, weakMapGet, weakMapHas, hasOwnProperty, 		console,
		getRandomValues, typedArrayGetLength, imageDataGetData, canvasGetWidth, canvasGetHeight, customEventGetDetail,

 		getScriptSource() { return script +''; },

		log, notImplemented,
		fakes: new WeakMap, fakeAPIs,
		hiddenFunctions: new WeakMap,

		originals: {
			Error_p: {
				constructor: Error,
				get_stack: getGetter(Error.prototype, 'stack'),
			},
			Function_p: {
				constructor: Function,
				toString: Function.prototype.toString, // TODO: Function.prototype.toSource (firefox), Object.prototype.toString
			},
			Node_p: window && {
				cloneNode: Node.prototype.cloneNode,
			},
			Element_p: window && {
				get_clientWidth: getGetter(Element.prototype, 'clientWidth'),
				get_clientHeight: getGetter(Element.prototype, 'clientHeight'),
			},
			HTMLElement_p: window && {
				get_offsetWidth: getGetter(HTMLElement.prototype, 'offsetWidth'),
				get_offsetHeight: getGetter(HTMLElement.prototype, 'offsetHeight'),
			},
			HTMLIFrameElement_p: window && {
				get_contentDocument: getGetter(HTMLIFrameElement.prototype, 'contentDocument'),
				get_contentWindow: getGetter(HTMLIFrameElement.prototype, 'contentWindow'),
			},
			HTMLCanvasElement_p: window && { // TODO: off screen canvas ?
				toDataURL: HTMLCanvasElement.prototype.toDataURL,
				toBlob: HTMLCanvasElement.prototype.toBlob,
				mozGetAsFile: HTMLCanvasElement.prototype.mozGetAsFile,
				getContext: HTMLCanvasElement.prototype.getContext,
			},
			CanvasRenderingContext2D_p: window && { // TODO: off screen canvas ?
				getImageData: CanvasRenderingContext2D.prototype.getImageData,
				putImageData: CanvasRenderingContext2D.prototype.putImageData,
			},
			WebGLRenderingContext_p: window && { // TODO: off screen canvas ?
				readPixels: WebGLRenderingContext.prototype.readPixels,
			},
			setTimeout, setInterval, setImmediate: self.setImmediate,
			Worker_p: {
				constructor: typeof Worker !== 'undefined' ? Worker : null, // TODO: no Worker within workers in chrome?
			},
		},

		postMessage(message) {
			call(dispatchEvent, window, new CustomEvent('getStopFingerprintingPostMessage$'+ token, { detail: message, }));
		},
		notify(level, ...messages) {
			if (!window) { console.log('notify', level, ...messages); return; } // TODO: worker
			this.postMessage({ name: 'notify', args: [ level, ...messages, ], });
		},

		// Element.offsetWith/Height randomization
		getOffsetSize(client, offset, element) {
			const correct = call(offset, element);
			if (!correct || call(client, element)) { return correct; }
			const factor = this.randomFontFactor();
			return correct === correct << 0 ? round(correct * factor) : correct * factor;
		},
		randomFontFactor: (() => {
			const dispersion = options.fonts.dispersion / 100;
			const offset = 1 - dispersion;
			const factor = 2 * dispersion / (256 * 256);
			const rand = new Random(256 * 256);
			return () => offset + rand() * factor;
		})(),

		// <canvas> randomization
		randomizeCanvas(canvas) {
			const { getImageData, putImageData } = this.originals.CanvasRenderingContext2D_p;
			this.notify('info', 'Randomized Canvas', 'Spoiled possible fingerprinting');
			const ctx = call(this.originals.HTMLCanvasElement_p.getContext, canvas, '2d');
			const imageData = call(getImageData, ctx, 0, 0, canvasGetWidth(canvas), canvasGetHeight(canvas));
			this.randomizeUInt8Array(imageDataGetData(imageData));
			const clone = call(this.originals.Node_p.cloneNode, canvas, true);
			call(putImageData, call(this.originals.HTMLCanvasElement_p.getContext, clone, '2d'), imageData, 0, 0);
			return clone;
		},
		getRandomBytes(length) {
			const buffer = new ArrayBuffer(length);
			for (let offset = 0; offset < length; offset += 65536) {
				getRandomValues(new Uint8Array(buffer, offset, min(length - offset, 65536)));
			}
			return new Uint8Array(buffer);
		},
		randomizeUInt8Array(data) {
			const rnd = this.getRandomBytes(data.length);
			let w = 0, mask = 0;
			for (let i = 0, l = typedArrayGetLength(data); i < l; ++i) {
				w = data[i];
				mask = (1 << (32 - clz32(w))) - 1 >>> 2; // TODO: this leaves deterministic bits
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
	forEach(keys(context), key => typeof context[key] === 'function' && (context[key] = bind(context[key], context)));
	log('created context', context);

	context.buildScript = (`
		const { ${ join(keys(context), ', ') }, } = context;
		const { ${ join(keys(context.originals), ', ') }, } = context.originals;
		return (${ replace(createAPIs, '{', `{ 'use strict';`) })();
	`);

	// 'save' context
	window && window.addEventListener('getStopFingerprintingContext$'+ token, event => customEventGetDetail(event).return(context));

	return context;
})();


// executed in the target global context itself with 'context' and 'context.originals' expanded in the surrounding scope (s.o.)
function createAPIs() {
	const {
		TypeError,
		Promise, Promise: { resolve: Resolve, },
		Symbol, Symbol: { iterator, toStringTag, },
	} = self;

	const apis = { };

	function define(name, object) {
		const current = apis[name] || { };
		if (typeof object === 'function') { object = object(current); }
		return (apis[name] = assign(current, object));
	}

	// fake function+'' => [native code]
	function hideCode(name, func) {
		if (typeof name === 'object') {
			const prop = getOwnPropertyDescriptor(name, keys(name)[0]);
			func = prop.get || prop.set;
			name = func.name;
		} else if (!func) {
			func = name;
			name = func.name;
		}
		weakMapSet(hiddenFunctions, func, name || '');
		options.debug && (func.isFaked = true);
		return func;
	}
	function hideAllCode(object) {
		forEach(keys(object), key => typeof object[key] === 'function' && hideCode(object[key]));
		return object;
	}
	define('Function.prototype', {
		toString: { value: hideCode(function toString() {
			if (weakMapHas(hiddenFunctions, this)) {
				return 'function '+ weakMapGet(hiddenFunctions, this) +'() { [native code] }';
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
		define('self', {
			Function: { value: Function, },
			eval: { value: hideCode('eval', function(x) { throw new Error('call to eval() blocked by CSP'); }), },
			setTimeout: { value: hideCode(function setTimeout(x) { return typeof x === 'function' ? apply(setTimeout, this, arguments) : 0; }), },
			setInterval: { value: hideCode(function setInterval(x) { return typeof x === 'function' ? apply(setInterval, this, arguments) : 0; }), },
			setImmediate: { value: hideCode(function setImmediate(x) { return typeof x === 'function' ? apply(setImmediate, this, arguments) : 0; }), },
		}); // TODO: any more?
	}

	// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
	define('HTMLIFrameElement.prototype', {
		contentWindow: { get: hideCode(function() {
			const window = call(HTMLIFrameElement_p.get_contentWindow, this);
			if (window) { try {
				fakeAPIs(window);
			} catch (error) { console.error('fakeAPIs in get contentWindow failed', error); } }
			return window;
		}), },
		contentDocument: { get: hideCode(function() {
			const document = call(HTMLIFrameElement_p.get_contentDocument, this);
			if (document) { try {
				fakeAPIs(document.defaultView);
			} catch (error) { console.error('fakeAPIs in get contentDocument failed', error); } }
			return document;
		}), },
	});
	// TODO: window.frames

	// screen
	define('Screen.prototype', screen => keys(values.screen).forEach(
		prop => screen[prop] = { get: hideCode(function() { return values.screen[prop]; }), }
	));
	define('self', {
		devicePixelRatio: {
			get: hideCode({ get devicePixelRatio() { return values.screen.devicePixelRatio; }, }),
			set: hideCode({ set devicePixelRatio(v) { }, }),
		},
	});

	define('MediaDevices.prototype', {
		enumerateDevices: { value: hideCode(function enumerateDevices() { return Resolve([ ]); }), },
	});

	// navigator string values
	const navigator = { };
	keys(values.navigator)
	.forEach(prop => navigator[prop] = { get: hideCode(function() { return values.navigator[prop]; }), enumerable: true, configurable: true, add: true, });
	keys(values.navigator.undefinedValues)
	.forEach(prop => navigator[prop] = { delete: true, });
	delete navigator.undefinedValues;
	define('Navigator.prototype', navigator);
	define('WorkerNavigator.prototype', navigator);

	// navigator.plugins
	const PluginArray = apis.PluginArray = hideCode(function PluginArray() { throw new TypeError('Illegal constructor'); });
	assign(PluginArray.prototype, hideAllCode({
		item() { return null; },
		namedItem() { return null; },
		refresh() { return; },
	}));
	defineProperties(PluginArray.prototype, {
		length: { get: hideCode(function() { return 0; }), enumerable: true, configurable: true, },
		[iterator]: { value: hideCode(function values() { return [][iterator](); }), writable: true, enumerable: false, configurable: true, },
		[toStringTag]: { value: 'PluginArray', writable: false, enumerable: false, configurable: true, },
	});
	const pluginArrayInstance = create(PluginArray.prototype);
	navigator.plugins = { get: hideCode({ get plugins() { return pluginArrayInstance; }, }), };

	// navigator.mimeTypes
	const MimeTypeArray = apis.MimeTypeArray = hideCode(function MimeTypeArray() { throw new TypeError('Illegal constructor'); });
	assign(MimeTypeArray.prototype, hideAllCode({
		item() { return null; },
		namedItem() { return null; },
	}));
	defineProperties(MimeTypeArray.prototype, {
		length: { get: hideCode(function() { return 0; }), enumerable: true, configurable: true, },
		[iterator]: { value: hideCode(function values() { return [][iterator](); }), writable: true, enumerable: false, configurable: true, },
		[toStringTag]: { value: 'MimeTypeArray', writable: false, enumerable: false, configurable: true, },
	});
	const mimeTypeArrayInstance = create(MimeTypeArray.prototype);
	navigator.mimeTypes = { get: hideCode({ get mimeTypes() { return mimeTypeArrayInstance; }, }), };

	// navigator.sendBeacon
	navigator.sendBeacon = { value: hideCode(function sendBeacon(arg) {
		if (!arguments.length) { throw new TypeError('Not enough arguments to Navigator.sendBeacon.'); }
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
	.forEach(prop => canvas[prop] = { value: hideCode(prop, function() {
		log('HTMLCanvasElement.prototype.', prop);
		return apply(HTMLCanvasElement_p[prop], randomizeCanvas(this), arguments);
	}), });
	define('CanvasRenderingContext2D.prototype', {
		getImageData: { value: hideCode(function getImageData(a, b, c, d) {
			const data = apply(CanvasRenderingContext2D_p.getImageData, this, arguments);
			randomizeUInt8Array(data.data);
			return data;
		}), },
	});
	define('WebGLRenderingContext.prototype', {
		readPixels: { value: hideCode(function readPixels(a, b, c, d, e, f, data) {
			apply(WebGLRenderingContext_p.readPixels, this, arguments);
			randomizeTypedArray(data);
		}), },
	});

	// workers
	if (Worker_p.constructor) {
		const Original = Worker_p.constructor;
		const Worker = hideCode(function Worker(url) {
			// TODO: this/new/argument error handling
			console.log('caught worker construction');
			const blob = new Blob([ `(() => { const script = (${ getScriptSource() }); (`+ ((options, url) => {
				// worker specific
				Object.defineProperty(WorkerGlobalScope.prototype, 'location', { value: new URL(url), });

				// general
				script.call(self, options, script);

				// call original script
				self.importScripts(url); // sync (?)
			}) +`)(JSON.parse(\`${ JSON.stringify(options) }\`), ("${ new URL(url, location) }")); })()`, ]);

			const blobUrl = createObjectURL(blob);
			setTimeout(() => revokeObjectURL(blobUrl));

			return new Original(blobUrl);
		});
		defineProperty(Worker, 'prototype', { value: Original.prototype, });

		define('self', {
			Worker: { value: Worker, },
		});
	}

	return apis;
}


class FakedAPIs {
	constructor(global) {
		this.global = global;
		this.build();
	}

	build() {
		this.apis = new this.global.Function('context', context.buildScript)(context);
	}

	apply() {
		const { global, apis, } = this;

		forEach(keys(apis), key => {
			const target = reduce(split(key, '.'), (object, key) => object && object[key], global);
			target && setProps(target, apis[key]);
		});

		if (options.debug) {
			global.applyCount = (global.applyCount || 0) + 1;
			global.context = context;
		}
	}
}

function setProps(object, props) {
	keys(props).forEach(key => {
		const prop = props[key];
		if (!prop.add && !hasOwnProperty(object, key)) { return; }
		if (prop.delete) { return delete object[key]; }
		defineProperty(object, key, prop);
	});
	return object;
}

function fakeAPIs(global) {
	const host = global.frameElement;
	if (host && (/^data:/).test(host.src)) {
		console.log('Redirecting frame with "data:" src to about:blank', host);
		const { parentNode, nextSibling, } = host;
		host.remove();
		host.src = 'about:blank';
		parentNode.insertBefore(host, nextSibling);
		return;
	}

	let fake = weakMapGet(context.fakes, global);
	if (!fake) {
		fake = new FakedAPIs(global);
		weakMapSet(context.fakes, global, fake);
		console.log('fake.build', host);
	}
	fake.apply(); // TODO: find a better solution
	// console.log('fake.apply', host);
}

function attachObserver() {
	if (typeof MutationObserver === 'undefined') { return; } // worker
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

function getGetter(proto, prop) {
	const desc = getOwnPropertyDescriptor(proto, prop);
	return desc && desc.get || function() { return this[prop]; };
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
	fakeAPIs(self);
	attachObserver();
})();

};
