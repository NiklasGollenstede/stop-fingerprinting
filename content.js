'use strict';

/**
 * This function does the actual work of this add-on. All the other code just makes sure that this function is called on every window object that gets created.
 * @param  {Window|Document}  object   The global object that just got created. Needs to be passed in before any page scripts could read it.
 */
module.exports = function fakeAPIs(window) {
window = window.defaultView || window; // window may actually be a Document


/**
 * Overwrites all getters in object with those from getters.
 * @param  {object}  object   The target object.
 * @param  {object}  options  Optional options containing:
 * @param  {bool}    .bind    If true .bind() is used to hide the new getters source (which will make the this reference undefined).
 * @param  {bool}    .old     If true the old getter will be passed as the first argument to the new getter at every call.
 * @param  {object}  getters  Object whose members will be used as the new getters.
 * @return {object}           The first argument.
 */
function fakeGetters(object, options, getters) {
	if (!getters) { getters = options; options = { }; }
	const bind = options && options.bind;
	const old = options && options.old;
	Object.keys(getters).forEach(key => {
		const get = old && Object.getOwnPropertyDescriptor(object, key).get;
		Object.defineProperty(object, key, { get: bind ? getters[key].bind(bind, get) : get ? function() { return getters[key].call(this, get); } : getters[key], });
	});
	return object;
}

/**
 * Should set <instnace>.__proto__[Symbol.toStringTag] = () => '[object '+ constructor.name +']'
 * Until that works, we'll have to settle with toString().
 */
function toStringTag(proto, name = proto.constructor.name) {
	const string = '[object '+ name +']';
	Object.defineProperty(proto, 'toString', {
		enumerable: false, writable: true, configurable: true,
		value: function toString() { return string; }, // TODO: Use Symbol.toStringTag
	});
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

/**
 * Returns a function that decrements an internal random number at every call. returns true exactly when the internal random reaches zero and starts anew.
 * @param {function}  source  A function that is called to fill the internal random slot.
 */
function Decrementor(source) {
	let current = source();
	function get() {
		if (!current) {
			current = source();
			return true;
		}
		--current;
		return false;
	}
	return get;
}

// emulate standard fullHD screen
fakeGetters(window.Screen.prototype, { bind: true, }, {
	width() { return 1920; },
	availWidth() { return 1920; },
	height() { return 1080; },
	availHeight() { return 1040; }, // 40px for taskbar at bottom
	colorDepth() { return 24; },
	pixelDepth() { return 24; },
	top() { return 0; },
	left() { return 0; },
	availTop() { return 0; },
	availLeft() { return 0; },
});
window.devicePixelRatio = 1;

// hide media devices
window.MediaDevices.prototype.enumerateDevices = function() { return Promise.resolve([ ]); }.bind();

// make window.navigator.userAgent related properties match (if a custom ua is set)
fakeGetters(window.Navigator.prototype, {
	oscpu() {
		const ua = (this.wrappedJSObject || this).userAgent || ''; // TODO: make sure iframes match their .parent
		const match = String.match(ua, /\((.*?); ?rv:/);
		return match && match[1] || 'Windows NT 6.1; Win64; x64';
	},
	productSub() {
		const ua = (this.wrappedJSObject || this).userAgent || '';
		const match = String.match(ua, /Gecko\/(\d+)/);
		return match && match[1] || '20100101';
	},
});

// hide plugins
fakeGetters(window.Navigator.prototype, {
	plugins() {
		return window.Object.create(window.PluginArray.prototype);
	},
	mimeTypes() {
		return window.Object.create(window.MimeTypeArray.prototype);
	},
});
toStringTag(window.PluginArray.prototype);
toStringTag(window.MimeTypeArray.prototype);
fakeGetters(window.PluginArray.prototype, { bind: true, }, {
	length() { return 0; },
});
Object.assign(window.PluginArray.prototype, {
	refresh() { },
	namedItem() { return null; },
});
fakeGetters(window.MimeTypeArray.prototype, { bind: true, }, {
	length() { return 0; },
});
Object.assign(window.MimeTypeArray.prototype, {
	namedItem() { return null; },
	item() { return null; },
});

const addPixel = new Decrementor(new Random(20));

// add a bit of randomness to inline elements width and height to confuse font detection
fakeGetters(window.HTMLElement.prototype, { old: true, }, {
	offsetWidth(old) {
		const correct = old.call(this);
		if (!correct || correct === 1 || this.clientWidth) { return correct; }
		return correct + addPixel();
	},
	offsetHeight(old) {
		const correct = old.call(this);
		if (!correct || correct === 1 || this.clientWidth) { return correct; }
		return correct + addPixel();
	},
});

};

