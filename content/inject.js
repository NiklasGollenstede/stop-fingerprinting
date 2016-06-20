// one line of padding
const script = window.script = function(options, script, workerOptions)  { 'use strict'; // license: MPL-2.0

const self = this;
const window = self.constructor.name === 'Window' ? self : null;
const worker = window ? null : self;

const {
	Math, Math: {
		clz32,
		random,
		round,
		min,
		max,
		ceil,
		log2,
		pow, },
	Number, Number: {
		MAX_SAFE_INTEGER, },
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
	String, String: {
		raw, },
	Symbol, Symbol: {
		iterator,
		toStringTag, },
	Reflect, Reflect: {
		construct,
		apply, },
	Blob,
	URL, URL: {
		createObjectURL,
		revokeObjectURL, },
	JSON, JSON: {
		stringify, },
	ImageData, WebGLRenderingContext: { prototype: {
		RGBA, UNSIGNED_BYTE, }, },
} = self;

const _call          =            Function .prototype.call;
const call           = _call.bind(Function .prototype.call);
const bind           = _call.bind(Function .prototype.bind);
const forEach        = _call.bind(Array    .prototype.forEach);
const map            = _call.bind(Array    .prototype.map);
const reduce         = _call.bind(Array    .prototype.reduce);
const join           = _call.bind(Array    .prototype.join);
const split          = _call.bind(String   .prototype.split);
const replace        = _call.bind(String   .prototype.replace);
const test           = _call.bind(RegExp   .prototype.test);
const weakMapSet     = _call.bind(WeakMap  .prototype.set);
const weakMapGet     = _call.bind(WeakMap  .prototype.get);
const weakMapHas     = _call.bind(WeakMap  .prototype.has);
const hasOwnProperty = _call.bind(Object   .prototype.hasOwnProperty);
const querySelector     = window && _call.bind(Element          .prototype.querySelector);
const querySelectorAll  = window && _call.bind(Element          .prototype.querySelectorAll);
const observe           = window && _call.bind(MutationObserver .prototype.observe);

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
const nodeGetTagName       = window && _call.bind(getGetter(Element            .prototype, 'tagName'));
const getContentWindow     = window && _call.bind(getGetter(HTMLIFrameElement  .prototype, 'contentWindow'));

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
		values: options, options, script, workerOptions, top: self, worker, window, topUrl: location.href,

		// all 'globals' from above here too
		Math, clz32, random, round, min, max, CustomEvent, dispatchEvent, Object, keys, create, assign, getOwnPropertyDescriptor, defineProperty, defineProperties, getPrototypeOf, Array, Function, ArrayBuffer, Uint8Array, Promise, String, raw, Symbol, iterator, toStringTag, Reflect, construct, apply, Blob, URL, createObjectURL, revokeObjectURL, JSON, stringify,
		call, bind, forEach, map, reduce, join, split, replace, test, weakMapSet, weakMapGet, weakMapHas, hasOwnProperty,
		console,
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
				constructor: self.Worker && self.Worker, // no Worker within workers in chrome
			},
			SharedWorker_p: {
				constructor: self.SharedWorker && self.SharedWorker, // no SharedWorker within workers
			},
			WorkerGlobalScope_p: {
				importScripts: worker && WorkerGlobalScope.prototype.importScripts,
			},
			XMLHttpRequest_p: {
				open: XMLHttpRequest.prototype.open,
			},
			MediaStreamTrack: {
				getSources: self.MediaStreamTrack && self.MediaStreamTrack.getSources,
			},
		},

		postMessage(message) {
			call(dispatchEvent, window, new CustomEvent('stopFingerprintingPostMessage$'+ token, { detail: message, }));
		},
		notify(level, what = { }) {
			what.url = this.topUrl;
			if (!window) { console.log('notify', level, what); return; } // TODO: worker
			this.postMessage({ name: 'notify', args: [ level, what, ], });
		},
		error(error) {
			alert('Unexpected exception: '+ (error && error.message || error));
			throw error;
		},

		// Element.offsetWith/Height randomization
		getOffsetSize(client, offset, element) {
			const correct = call(offset, element);
			if (!correct || call(client, element)) { return correct; }
			const factor = this.randomFontFactor();
			return correct === correct << 0 ? round(correct * factor) : correct * factor;
		},
		randomFontFactor: (() => {
			if (!options.fonts) { return null; }
			const dispersion = options.fonts.dispersion / 100;
			const offset = 1 - dispersion;
			const factor = 2 * dispersion / (256 * 256);
			const rand = new Random(256 * 256);
			return () => offset + rand() * factor;
		})(),

		// <canvas> randomization
		randomizeCanvas(canvas) {
			const { getImageData, putImageData } = this.originals.CanvasRenderingContext2D_p;
			const { getContext, } = this.originals.HTMLCanvasElement_p;
			const width = canvasGetWidth(canvas), height = canvasGetHeight(canvas);
			let imageData, data, ctx = call(getContext, canvas, '2d');
			if (ctx) {
				imageData = call(getImageData, ctx, 0, 0, canvasGetWidth(canvas), canvasGetHeight(canvas));
				data = imageDataGetData(imageData);
			} else {
				ctx
				=  call(getContext, canvas, 'webgl') || call(getContext, canvas, 'experimental-webgl')
				|| call(getContext, canvas, 'webgl2') || call(getContext, canvas, 'experimental-webgl2');
				if (!ctx) { return this.error(new Error('Could not get drawing context from canvas')); }
				imageData = new ImageData(width, height);
				data = new Uint8Array(typedArrayGetLength(imageDataGetData(imageData)));
				call(
					this.originals.WebGLRenderingContext_p.readPixels,
					ctx,
					0, 0, width, height,
					RGBA, UNSIGNED_BYTE,
					data
				);
			}
			this.randomizeUInt8Array(data, imageDataGetData(imageData));
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
		randomizeUInt8Array(source, target = source) {
			this.notify('info', { title: 'Randomized Canvas', message: 'Spoiled possible fingerprinting', });
			const l = typedArrayGetLength(source), rnd = this.getRandomBytes(l);
			let w = 0, mask = 0;
			for (let i = 0; i < l; ++i) {
				w = source[i];
				mask = (1 << (32 - clz32(w))) - 1 >>> 2; // TODO: this leaves deterministic bits
				target[i] = w ^ (mask & rnd[i]);
			}
			return target;
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
		TypeError, DOMException,
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
		if (!func) {
			func = name;
			name = func.name;
		} else {
			defineProperty(func, 'name', { value: name, });
		}
		weakMapSet(hiddenFunctions, func, name || '');
		options.debug && (func.isFaked = true);
		return func;
	}
	function hideAllCode(object) {
		forEach(keys(object), key => typeof object[key] === 'function' && hideCode(object[key]));
		return object;
	}
	{
		const nativeFunctionBody = options.misc.browser === 'firefox' ? '() {\n    [native code]\n}' : '() { [native code] }';
		const toString = hideCode(function toString() {
			if (weakMapHas(hiddenFunctions, this)) {
				return 'function '+ weakMapGet(hiddenFunctions, this) + nativeFunctionBody;
			}
			return Function_p.toString.call(this);
		});
		define('Function.prototype', {
			toString: { value: toString, },
			toSource: { value: toString, },
		});

	}
	// TODO: hide stack traces
	// TODO: wrap mutation observer and mutation events to hide script injection

	// disable CSPs 'unsafe-eval' if it was inserted by the background scripts
	if (values.misc.disableEval) {
		const Function = hideCode(function Function(x) { throw new Error('call to Function() blocked by CSP'); });
		Function.prototype = getPrototypeOf(x => x);
		Function.prototype.constructor = Function;
		define('self', {
			Function: { value: Function, },
			eval: { value: hideCode('eval', function(x) { throw new Error('call to eval() blocked by CSP'); }), },
			setTimeout: { value: hideCode('setTimeout', function(x) { return typeof x === 'function' ? apply(setTimeout, this, arguments) : 0; }), },
			setInterval: { value: hideCode('setInterval', function(x) { return typeof x === 'function' ? apply(setInterval, this, arguments) : 0; }), },
			setImmediate: { value: hideCode('setImmediate', function(x) { return typeof x === 'function' ? apply(setImmediate, this, arguments) : 0; }), },
		}); // TODO: any more?
	}

	// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
	define('HTMLIFrameElement.prototype', { // TODO: check in these (expensive) handlers are necessary
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

	// remove window.name
	if (window && !options.keepWindowName) {
		define('self', {
			name: { value: '', },
		});
	}

	// screen
	if (options.screen) {
		define('Screen.prototype', screen => keys(values.screen).forEach(
			prop => screen[prop] = { get: hideCode(function() { return values.screen[prop]; }), }
		));
		define('self', {
			devicePixelRatio: {
				get: hideCode('get devicePixelRatio', function() { return values.screen.devicePixelRatio; }),
				set: hideCode('set devicePixelRatio', function(v) { }), // TODO: let it be set but (optionally ?) overwrite it when the tabs zoom changes
			},
		});
		// TODO: make window.outerWidth/height match .inner...
	}

	// navigator.mediaDevices.enumerateDevices
	if (options.devices.hideAll) {
		define('MediaDevices.prototype', {
			enumerateDevices: { value: hideCode(function enumerateDevices() { return Resolve([ ]); }), },
		});
		define('MediaStreamTrack', {
			getSources: { value: hideCode(function getSources(cb) { MediaStreamTrack.getSources(function() { call(cb, this, [ ]); }); }), },
		});
	}

	{ // everything that is changes the navigator object
		const navigator = { };

		// navigator string values
		if (options.navigator) {
			forEach(keys(values.navigator), prop => navigator[prop] = { get: hideCode(function() { return values.navigator[prop]; }), enumerable: true, configurable: true, add: true, });
			forEach(keys(values.navigator.undefinedValues), prop => navigator[prop] = { delete: true, });
			delete navigator.undefinedValues;
		}

		// navigator.plugins
		if (options.plugins.hideAll) {
			const PluginArray = hideCode(function PluginArray() { throw new TypeError('Illegal constructor'); });
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
			navigator.plugins = { get: hideCode('get plugins', function() { return pluginArrayInstance; }), };
			define('self', { PluginArray: { value: PluginArray, }, });

			// navigator.mimeTypes
			const MimeTypeArray = hideCode(function MimeTypeArray() { throw new TypeError('Illegal constructor'); });
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
			navigator.mimeTypes = { get: hideCode('get mimeTypes', function() { return mimeTypeArrayInstance; }), };
			define('self', { MimeTypeArray: { value: MimeTypeArray, }, });
		}

		// navigator.sendBeacon
		navigator.sendBeacon = { value: hideCode(function sendBeacon(arg) {
			if (!arguments.length) { throw new TypeError('Not enough arguments to Navigator.sendBeacon.'); }
			return true;
		}), };

		define('Navigator.prototype', navigator);
		define('WorkerNavigator.prototype', navigator);
	}

	// HTMLElement.offsetWidth/Height
	if (options.fonts) {
		define('HTMLElement.prototype', {
			offsetWidth: { get: hideCode('get offsetWidth', function() {
				return getOffsetSize(Element_p.get_clientWidth, HTMLElement_p.get_offsetWidth, this);
			}), },
			offsetHeight: { get: hideCode('get offsetHeight', function() {
				return getOffsetSize(Element_p.get_clientHeight, HTMLElement_p.get_offsetHeight, this);
			}), },
		});
	}

	// HTMLCanvasElement
	if (options.canvas) {
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
	}

	// BroadcastChannel (firefox only)
	define('BroadcastChannel.prototype', { // TODO: make it optional
		postMessage: { value: hideCode(function postMessage(a) {
			// TODO: arguments/this error handling
		}), },
	});

	// performance.navigation
	define('PerformanceNavigation.prototype', { // TODO: make it optional
		type: { get: hideCode('get type', function() { return 0; }), },
		toJSON: { value: hideCode(function toJSON() { return { type: 0, redirectCount: this.redirectCount, }; }), },
	});

	// workers
	forEach([ '', 'Shared', ], shared => {
		const ctorName = shared +'Worker';
		const Original = originals[ctorName +'_p'].constructor;
		if (!Original) { return; }
		const Worker = hideCode(ctorName, function(url) {
			if (!new.target) { throw new TypeError(`Constructor ${ ctorName } requires 'new'`); }
			if (!arguments.length) { throw new TypeError(`Not enough arguments to ${ ctorName }.`); }
			if (options.misc.disableChildBlobUrl && test((/^blob:/), url)) {
				throw new DOMException (`Failed to construct '${ ctorName }': Access to the script at '${ url }' is denied by the document's Content Security Policy.`);
			}

			console.log('caught worker construction');
			const blob = new Blob([ `(() => {
				const script = (${ getScriptSource() });
				(`+ ((options, workerOptions) => {
					script.call(self, options, script, workerOptions);

					try {
						self.importScripts(workerOptions.entryUrl); // chrome ignores the CSP here
					} catch (error) {
						throw new (typeof NetworkError !== 'undefined' ? NetworkError : DOMException)(`Failed to load worker script at "${ url }"`);
					}
				}) +`)(
					JSON.parse(\`${ stringify(options) }\`),
					{
						entryUrl: "${ new URL(url, location) }",
						name: decodeURI("${ encodeURI(shared && arguments[1] || '') }"),
					}
				);
			})()`, ]);

			const blobUrl = createObjectURL(blob);
			setTimeout(() => revokeObjectURL(blobUrl), 10);

			return construct(Original, [ blobUrl, ], new.target);
		});
		defineProperty(Worker, 'prototype', { value: Original.prototype, });

		define('self', {
			[ctorName]: { value: Worker, },
		});
	});

	// in a Worker
	if (worker) {
		const locationString = workerOptions.entryUrl;
		define('WorkerLocation.prototype', location => {
			const _location = new URL(locationString);
			forEach(keys(WorkerLocation.prototype), prop => {
				const value = _location[prop];
				location[prop] = { get: hideCode('get '+ prop, function() { return value; }), };
			});
			location.toString = { value: hideCode(function toString() { return locationString; }), };
		});
		define('WorkerGlobalScope.prototype', {
			importScripts: { value: hideCode(function importScripts() {
				return apply(WorkerGlobalScope_p.importScripts, this, map(arguments, url => new URL(url, locationString)));
			}), },
		});
		define('XMLHttpRequest.prototype', {
			open: { value: hideCode(function open(a, b) {
				if (arguments.length >= 2) { arguments[1] = new URL(arguments[1], locationString); }
				return apply(XMLHttpRequest_p.open, this, arguments);
			}), },
		});
		// TODO: onerror.filename

		// in a SharedWorker
		if (test((/^Shared/), worker.constructor.name)) {
			define('self', {
				name: { value: workerOptions.name, },
			});
		}
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
	// TODO: is it save to forEach over NodeLists ?
	const observer = new MutationObserver(mutations => forEach(mutations, ({ addedNodes, }) => forEach(addedNodes, element => {
		let tag; try { tag = nodeGetTagName(element); } catch (e) { }
		if (tag === 'IFRAME') {
			// console.log('direct: attaching to iframe', element);
			fakeAPIs(getContentWindow(element), element);
		} else if(tag && querySelector(element, 'iframe')) {
			forEach(querySelectorAll(element, 'iframe'), element => { try {
				// console.log('loop: attaching to iframe', element);
				fakeAPIs(getContentWindow(element), element);
			} catch(error) { console.error(error); } });
		}
	})));
	observe(observer, document, { subtree: true, childList: true, });
}

/**
 * Returns a function that returns pseudo randoms without calling Math.random() each time for small numbers.
 * @param {number}  n  Exclusive upper bound of the randoms. (0 <= random < n)
 */
function Random(n) { // TODO: test
	const shift = ceil(log2(n));
	const factor = n / pow(2, shift);
	const mask = (1 << shift) - 1;

	let index = Infinity, buffer = [ ];

	function get() {
		index = 0;
		let rnd = random() * MAX_SAFE_INTEGER << 0;
		for (let i = shift, j = 0; i < 32; i += shift, ++j) {
			buffer[j] = ((rnd & mask) * factor) << 0;
			rnd = rnd >> shift;
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
