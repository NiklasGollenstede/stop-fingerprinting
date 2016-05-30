// two lines
// padding
const script = window.script = function(__arg__)  { 'use strict'; const { token, } = __arg__;

const log = (...args) => (console.log(...args), args.pop());

const randomFontFactor = (rand => () => 0.75 + rand() / (2 * 256 * 256))(new Random(256 * 256));

let context = null;

function createContext(options) {
	const context = {
		values: options,

		token, log,
		fakes: new WeakMap,
		hiddenFunctions: new WeakMap,

		getOffsetSize(client, offset, element) {
			const correct = offset.call(element);
			if (!correct || client.call(element)) { return correct; }
			const factor = randomFontFactor();
			return correct === correct << 0 ? Math.round(correct * factor) : correct * factor;
		},
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
			devicePixelRatio: window.devicePixelRatio,
			functionToString: window.Function.prototype.toString, // TODO: Function.prototype.toSource (firefox), Object.prototype.toString
			iFrameContentDocument: Object.getOwnPropertyDescriptor(window.HTMLIFrameElement.prototype, 'contentDocument').get,
			iFrameContentWindow: Object.getOwnPropertyDescriptor(window.HTMLIFrameElement.prototype, 'contentWindow').get,
			htmlElementOffsetWidth: Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetWidth').get,
			htmlElementOffsetHeight: Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetHeight').get,
			elementClientWidth: Object.getOwnPropertyDescriptor(window.Element.prototype, 'clientWidth').get,
			elementClientHeight: Object.getOwnPropertyDescriptor(window.Element.prototype, 'clientHeight').get,
		};
		this.fakeAPIs = fakeAPIs;
		this.build();
	}

	build() {
		this.apis = new this.window.Function('"use strict"; return (function '+ (this._build +'').replace(/^(function )?/, '') +').call(this);').call(this);
	}

	// executed in the target window itself
	_build() {
		const _this = this;
		const { context, originals, fakeAPIs, window, } = this;
		const { functionToString, iFrameContentDocument, iFrameContentWindow, devicePixelRatio, htmlElementOffsetWidth, htmlElementOffsetHeight, elementClientWidth, elementClientHeight, } = originals;
		const { hiddenFunctions, token, getOffsetSize, values, log, } = context;
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
				return functionToString.call(this);
			}), },
		};

		// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
		/*apis['HTMLIFrameElement.prototype'] = {
			contentWindow: { get: hideCode(function() {
				const window = iFrameContentWindow.call(this);
				if (window) { try {
					fakeAPIs(window);
				} catch (error) { console.error('fakeAPIs in get contentWindow failed', error); } }
				return window;
			}), },
			// TODO: contentDocument
		};*/
		// TODO: window.frames

		// screen
		const screen = apis['Screen.prototype'] = { };
		[ 'width', 'availWidth', 'height', 'availHeight', 'colorDepth', 'pixelDepth', 'top', 'left', 'availTop', 'availLeft', ]
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
		[ 'userAgent', 'platform', ] // XXX
		.forEach(prop => navigator[prop] = { get: hideCode(function() { return values.navigator[prop]; }), });

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
				return getOffsetSize(elementClientWidth, htmlElementOffsetWidth, this);
			}, }), },
			offsetHeight: { get: hideCode({ get offsetHeight() {
				return getOffsetSize(elementClientHeight, htmlElementOffsetHeight, this);
			}, }), },
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
function setGetters(object, getters) {
	Object.keys(getters).forEach(key => {
		if (!object.hasOwnProperty(key)) { return; }
		Object.defineProperty(object, key, { get: getters[key], });
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
function Random(n) {
	const shift = Math.ceil(Math.log2(n));
	const factor = n / Math.pow(2, shift);
	const mask = (1 << shift) - 1;

	let index = Infinity, buffer = [ ];

	function get() {
		index = 0;
		let random = Math.random() * Number.MAX_SAFE_INTEGER;
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

function notImplemented() {
	throw new Error('not implemented');
}



return (function main() {
	context = getContext();
	if (context) {
		fakeAPIs(window);
		attachObserver();
		return { };
	} else {
		window.addEventListener('stopFingerprintingOptionsLoaded$'+ token, function onLoaded({ detail, }) {
			window.removeEventListener('stopFingerprintingOptionsLoaded$'+ token, onLoaded);
			context = setContext(createContext(detail.options));
			fakeAPIs(window);
			attachObserver();
		});
		return { getOptions: true, };
	}
})();

};
