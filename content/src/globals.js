
	const global = this.ucw;
	let   _ = global;
	const window = global.constructor.name === 'Window' ? global : null;
 //	const worker = window ? null : global;
 //	const document = window && window.document;
 //	const documentElement = document && document.documentElement;

/**
 * Constructors / Functions
 */
 //	const alert                        = _.alert;
	const Array                        = _.Array;
	const ArrayBuffer                  = _.ArrayBuffer;
 //	const Blob                         = _.Blob;
 //	const clearTimeout                 = _.clearTimeout;
 //	const clearInterval                = _.clearInterval;
 //	const clearImmediate               = _.clearImmediate;
 //	const CustomEvent                  = _.CustomEvent;
 //	const dispatchEvent                = _.dispatchEvent;
 //	const Function                     = _.Function;
 //	const encodeURI                    = _.encodeURI;
	const Error                        = _.Error;
	const ImageData                    = _.ImageData;
 //	const MutationObserver             = _.MutationObserver;
 //	const Map                          = _.Map;
	let   Object                       = _.Object; // used in this file
	const open                         = _.open;
 //	const Promise                      = _.Promise;
	const RegExp                       = _.RegExp;
 //	const Set                          = _.Set;
 //	const setTimeout                   = _.setTimeout;
 //	const setInterval                  = _.setInterval;
 //	const setImmediate                 = _.setImmediate;
 //	const SharedWorker                 = _.SharedWorker; // no SharedWorker within workers
	const TypeError                    = _.TypeError;
	const Uint8Array                   = _.Uint8Array;
 //	const URL                          = _.URL;
	const WeakMap                      = _.WeakMap;
 //	const WeakSet                      = _.WeakSet;
 //	const Worker                       = _.Worker; // no Worker within workers in chrome
 //	const WorkerLocation               = _.WorkerLocation; // no Worker within workers in chrome

/**
 * (ststic) Functions / Values
 */
// crypto
	const getRandomValues              = _.crypto                     .getRandomValues.bind(_.crypto);
// JSON
 //	const stringify                    = _.JSON                       .stringify;
// Object
	const keys                         = _.Object                     .keys;
	const create                       = _.Object                     .create;
	const assign                       = _.Object                     .assign;
	let   getOwnPropertyDescriptor     = _.Object                     .getOwnPropertyDescriptor;
	const defineProperty               = _.Object                     .defineProperty;
	const defineProperties             = _.Object                     .defineProperties;
	let   getPrototypeOf               = _.Object                     .getPrototypeOf;
// Math
	const clz32                        = _.Math                       .clz32;
	const random                       = _.Math                       .random;
	const round                        = _.Math                       .round;
	const min                          = _.Math                       .min;
 //	const max                          = _.Math                       .max;
	const ceil                         = _.Math                       .ceil;
	const log2                         = _.Math                       .log2;
	const pow                          = _.Math                       .pow;
// Number
	const MAX_SAFE_INTEGER             = _.Number                     .MAX_SAFE_INTEGER;
// Reflect
	let   construct                    = _.Reflect                    .construct;
	const apply                        = _.Reflect                    .apply;
// String
 //	const raw                          = _.String                     .raw;
// Symbol
	const $iterator                    = _.Symbol                     .iterator;
	const $toStringTag                 = _.Symbol                     .toStringTag;
	let   $split                       = _.Symbol                     .split;
// URL
 //	const createObjectURL              = _.URL                        .createObjectURL;
 //	const revokeObjectURL              = _.URL                        .revokeObjectURL;
// MediaStreamTrack
 //	const getSources                   = _.MediaStreamTrack           && _.MediaStreamTrack.getSources;

// WebGLRenderingContext_p
	const RGBA                         = _.WebGLRenderingContext && _.WebGLRenderingContext.prototype.RGBA;
	const UNSIGNED_BYTE                = _.WebGLRenderingContext && _.WebGLRenderingContext.prototype.UNSIGNED_BYTE;

/**
 * Methods
 */
	let   _call                                             =                                    _.Function                   .prototype    .call;
	const call                                              =               _call.bind(          _.Function                   .prototype    .call);
 //	const bind                                              =               _call.bind(          _.Function                   .prototype    .bind);
	const forEach                                           =               _call.bind(          _.Array                      .prototype    .forEach);
 //	const map                                               =               _call.bind(          _.Array                      .prototype    .map);
	const reduce                                            =               _call.bind(          _.Array                      .prototype    .reduce);
 //	const join                                              =               _call.bind(          _.Array                      .prototype    .join);
	const test                                              =               _call.bind(          _.RegExp                     .prototype    .test);
	const hasOwnProperty                                    =               _call.bind(          _.Object                     .prototype    .hasOwnProperty);
 //	const querySelector                                     = window     && _call.bind(          _.Element                    .prototype    .querySelector);
 //	const querySelectorAll                                  = window     && _call.bind(          _.Element                    .prototype    .querySelectorAll);
 //	const startsWith                                        =               _call.bind(          _.String                     .prototype    .startsWith);

	const CanvasRenderingContext2D_p_getImageData           =               _call.bind(          _.CanvasRenderingContext2D   .prototype    .getImageData);
	const CanvasRenderingContext2D_p_putImageData           =               _call.bind(          _.CanvasRenderingContext2D   .prototype    .putImageData);
 //	const Elemet_p_remove                                   = window     && _call.bind(          _.Element                    .prototype    .remove);
	const Function_p_toString                               =               _call.bind(          _.Function                   .prototype    .toString); // TODO: Function.prototype.toSource (firefox), Object.prototype.toString
	const HTMLCanvasElement_p_getContext                    = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .getContext);
	const HTMLCanvasElement_p_toBlob                        = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .toBlob);
	const HTMLCanvasElement_p_toDataURL                     = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .toDataURL);
	const HTMLCanvasElement_p_mozGetAsFile                  = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .mozGetAsFile);
 //	const MutationObserver_p_observe                        = window     && _call.bind(          _.MutationObserver           .prototype    .observe);
	const MediaStreamTrack_p_getSources                     =               _call.bind(          _.MediaStreamTrack           .prototype    .getSources);
	const Node_p_cloneNode                                  = window     && _call.bind(          _.Node                       .prototype    .cloneNode);
 //	const Node_p_insertBefore                               = window     && _call.bind(          _.Node                       .prototype    .insertBefore);
	const RegExp_p_$split                                   =               _call.bind(          _.RegExp                     .prototype    [$split]); // don't use String_p_split, for RegExp as split arg it can be overwritten by this
 //	const Set_p_has                                         =               _call.bind(          _.Set                        .prototype    .has);
	const WeakMap_p_get                                     =               _call.bind(          _.WeakMap                    .prototype    .get);
	const WeakMap_p_has                                     =               _call.bind(          _.WeakMap                    .prototype    .has);
	const WeakMap_p_set                                     =               _call.bind(          _.WeakMap                    .prototype    .set);
	const WebGLRenderingContext_p_readPixels                =               _call.bind(          _.WebGLRenderingContext      .prototype    .readPixels);
 //	const WorkerGlobalScope_p_importScripts                 = worker     && _call.bind(          _.WorkerGlobalScope          .prototype    .importScripts);
 //	const XMLHttpRequest_p_open                             =               _call.bind(          _.XMLHttpRequest             .prototype    .open);

	const Promise_resolve                                   = _.Promise.resolve.bind(_.Promise);

/**
 * Getters
 */
 //	const CustomEvent_p_get_detail                          =               _call.bind(getGetter(_.CustomEvent                .prototype,   'detail'));
 //	const Document_p_get_URL                                = window     && _call.bind(getGetter(_.Document                   .prototype,   'URL'));
	const Element_p_get_clientHeight                        = window     && _call.bind(getGetter(_.Element                    .prototype,   'clientHeight'));
	const Element_p_get_clientWidth                         = window     && _call.bind(getGetter(_.Element                    .prototype,   'clientWidth'));
 //	const Element_p_get_tagName                             = window     && _call.bind(getGetter(_.Element                    .prototype,   'tagName'));
	const Error_p_get_stack                                 =               _call.bind(getGetter(_.Error                      .prototype,   'stack')); // firefox only, the stack trace creation in chrome is much more complex than a simple getter
	const Error_p_set_stack                                 =               _call.bind(getSetter(_.Error                      .prototype,   'stack'));
	const HTMLCanvasElement_p_get_height                    = window     && _call.bind(getGetter(_.HTMLCanvasElement          .prototype,   'height'));
	const HTMLCanvasElement_p_get_width                     = window     && _call.bind(getGetter(_.HTMLCanvasElement          .prototype,   'width'));
	const HTMLElement_p_get_offsetHeight                    = window     && _call.bind(getGetter(_.HTMLElement                .prototype,   'offsetHeight'));
	const HTMLElement_p_get_offsetWidth                     = window     && _call.bind(getGetter(_.HTMLElement                .prototype,   'offsetWidth'));
 //	const HTMLIFrameElement_p_get_contentDocument           = window     && _call.bind(getGetter(_.HTMLIFrameElement          .prototype,   'contentDocument'));
 //	const HTMLIFrameElement_p_get_contentWindow             = window     && _call.bind(getGetter(_.HTMLIFrameElement          .prototype,   'contentWindow'));
 //	const HTMLScriptElement_p_get_src                       = window     && _call.bind(getGetter(_.HTMLScriptElement          .prototype,   'src'));
	const ImageData_p_get_data                              =               _call.bind(getGetter(_.ImageData                  .prototype,   'data'));
 //	const Node_p_get_parentNode                             = window     && _call.bind(getGetter(_.Node                       .prototype,   'parentNode'));
 //	const Set_p_get_size                                    = window     && _call.bind(getGetter(_.Set                        .prototype,   'size'));
	const TypedArray_p_get_length                           =               _call.bind(getGetter(getPrototypeOf(_.Uint8Array  .prototype),  'length'));


/*const notImplemented = */function notImplemented() {
	throw new Error('not implemented');
}

/*const log = */function log() {
	console.log.apply(console, arguments); return arguments[arguments.length - 1];
}

function getGetter(proto, prop) {
	let   desc = getOwnPropertyDescriptor(proto, prop);
	return desc && desc.get || function() { return this[prop]; };
}
function getSetter(proto, prop) {
	let   desc = getOwnPropertyDescriptor(proto, prop);
	return desc && desc.set || function(v) { this[prop] = v; };
}


let hiddenFunctions = new WeakMap;

	const makeMethod      = function(      func)    { return makeFunction(func, func.name,         func.name, func.length, false,   false); };
	const makeNamedMethod = function(name, func)    { return makeFunction(func,      name,              name, func.length, false,   false); };
	const makeGetter      = function(      func)    { return makeFunction(func, func.name, 'get '+ func.name, func.length, false,   false); };
	const makeNamedGetter = function(name, func)    { return makeFunction(func,      name, 'get '+      name, func.length, false,   false); };
	const makeSetter      = function(      func)    { return makeFunction(func, func.name, 'set '+ func.name, func.length, false,   false); };
 //	const makeNamedSetter = function(name, func)    { return makeFunction(func,      name, 'set '+      name, func.length, false,   false); };
 //	const makeCtor        = function(func, isClass) { return makeFunction(func, func.name,         func.name, func.length,  true, isClass); };
	const makeIlligalCtor = function(name)          { return makeFunction(null,      name,              name,           0, false,    true); };

// TODO: what about arguments.caller in page callbacks in non-strict mode?

// ALL functions that are exposed to the page must pass through here AND must make sure to clone their return values into the page context
function makeFunction(body, name, fullName, length, isCtor, isClass) {
	if (typeof body !== 'function' && !(!isCtor && isClass)) { throw new TypeError('The function body must be a function'); }

	let wrapper = exportFunction(isCtor
		? function() {
			if (!new.target) {
				if (isClass) { throw new TypeError('class constructors must be invoked with |new|'); }
				// else: the construct call will throw the correct error
			}
			// if the wrapper is called with new, new.target is the body (this would set the wrong .__proto__ and thus expose the inner function to the page)
			try {
				return construct(body, arguments, new.target === body ? wrapper : new.target);
			} catch (error) {
				throw cloneError(error);
			}
		}
		: !isClass
		? function() { // TODO: the exposed function still has a [[Construct]] field, which is detectable by passing it as new.target into Reflect.construct()
			if (new.target) {
				throw new TypeError(name +' is not a constructor'); // TODO: instead if `name` this actually needs to be the local identifier of wrapper at it's call site
			}
			try {
				return apply(body, this, arguments);
			} catch (error) {
				throw cloneError(error);
			}
		}
		: function () { // not a ctor but a class? Can't be called
			throw new TypeError('Illegal constructor');
		}
	);

	// create prototype
	(isCtor || isClass) && defineProperty(wrapper, 'prototype', {
		value: defineProperty(new Object, 'constructor', {
			value: wrapper,
			writable: true, enumerable: false, configurable: true,
		}),
		writable: !isClass, enumerable: false, configurable: false,
	});

	// set .name and .length
	defineProperty(wrapper, 'length', { value: length,   writable: false, enumerable: false, configurable: true, });
	defineProperty(wrapper, 'name',   { value: fullName, writable: false, enumerable: false, configurable: true, });

	// ensure the correct string representation as 'function <bound >* <get |set >?<name> { [native code] }'
	WeakMap_p_set(hiddenFunctions, wrapper, fullName);

	// set debug info
	profile.debug && (wrapper.isFaked = { body, name, fullName, length, isCtor, isClass, });
	return wrapper;
}

let errorMap = new WeakMap(
	[ 'Error', 'EvalError', 'InternalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', ]
	.map(name => [ sandbox[name], global[name], ])
);

function cloneError(error) { // TODO: test
	if (!needsCloning(error)) { return error; }
	console.log('cloning Error', error);
	let Ctor = errorMap.get(error.constructor) || Error;
	return new Ctor(error.message); // this constructs page objects, so it _should_ be safe
}

sandbox.apis = { }; /* global apis */
const define = function define(name, object) {
	let current = apis[name] || { };
	if (typeof object === 'function') { object = object(current); }
	return (apis[name] = assign(current, object));
};
