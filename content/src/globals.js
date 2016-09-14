/* globals options */

const values = options;

const self = this;
const _ = self;
const window = self.constructor.name === 'Window' ? self : null;
const worker = window ? null : self;
const document = self.document;
const documentElement = document.documentElement;

/**
 * Constructors / Functions
 */
const alert                        = _.alert;
const Array                        = _.Array;
const ArrayBuffer                  = _.ArrayBuffer;
const Blob                         = _.Blob;
const CustomEvent                  = _.CustomEvent;
const dispatchEvent                = _.dispatchEvent;
const Function                     = _.Function;
const Error                        = _.Error;
const ImageData                    = _.ImageData;
const importScripts                = _.importScripts;
const Map                          = _.Map;
const Promise                      = _.Promise;
const Set                          = _.Set;
const SharedWorker                 = _.SharedWorker; // no SharedWorker within workers
const Uint8Array                   = _.Uint8Array;
const WeakMap                      = _.WeakMap;
const WeakSet                      = _.WeakSet;
const Worker                       = _.Worker; // no Worker within workers in chrome

/**
 * (ststic) Functions / Values
 */
// crypto
const getRandomValues              = _.crypto                     .getRandomValues.bind(_.crypto);
// JSON
const stringify                    = _.JSON                       .stringify;
// Object
const keys                         = _.Object                     .keys;
const create                       = _.Object                     .create;
const assign                       = _.Object                     .assign;
const getOwnPropertyDescriptor     = _.Object                     .getOwnPropertyDescriptor;
const defineProperty               = _.Object                     .defineProperty;
const defineProperties             = _.Object                     .defineProperties;
const getPrototypeOf               = _.Object                     .getPrototypeOf;
// Math
const clz32                        = _.Math                       .clz32;
const random                       = _.Math                       .random;
const round                        = _.Math                       .round;
const min                          = _.Math                       .min;
const max                          = _.Math                       .max;
const ceil                         = _.Math                       .ceil;
const log2                         = _.Math                       .log2;
const pow                          = _.Math                       .pow;
// Number
const MAX_SAFE_INTEGER             = _.Number                     .MAX_SAFE_INTEGER;
// Reflect
const construct                    = _.Reflect                    .construct;
const apply                        = _.Reflect                    .apply;
// String
const raw                          = _.String                     .raw;
// Symbol
const iterator                     = _.Symbol                     .iterator;
const toStringTag                  = _.Symbol                     .toStringTag;
// URL
const createObjectURL              = _.URL                        .createObjectURL;
const revokeObjectURL              = _.URL                        .revokeObjectURL;
// MediaStreamTrack
const getSources                   = _.MediaStreamTrack           && _.MediaStreamTrack.getSources;

// WebGLRenderingContext_p
const RGBA                         = _.WebGLRenderingContext && _.WebGLRenderingContext.prototype.RGBA;
const UNSIGNED_BYTE                = _.WebGLRenderingContext && _.WebGLRenderingContext.prototype.UNSIGNED_BYTE;

/**
 * Methods
 */
const _call                                             =                                    _.Function                   .prototype    .call;
const call                                              =               _call.bind(          _.Function                   .prototype    .call);
const bind                                              =               _call.bind(          _.Function                   .prototype    .bind);
const forEach                                           =               _call.bind(          _.Array                      .prototype    .forEach);
const map                                               =               _call.bind(          _.Array                      .prototype    .map);
const reduce                                            =               _call.bind(          _.Array                      .prototype    .reduce);
const join                                              =               _call.bind(          _.Array                      .prototype    .join);
const split                                             =               _call.bind(          _.String                     .prototype    .split);
const replace                                           =               _call.bind(          _.String                     .prototype    .replace);
const test                                              =               _call.bind(          _.RegExp                     .prototype    .test);
const hasOwnProperty                                    =               _call.bind(          _.Object                     .prototype    .hasOwnProperty);
const querySelector                                     = window     && _call.bind(          _.Element                    .prototype    .querySelector);
const querySelectorAll                                  = window     && _call.bind(          _.Element                    .prototype    .querySelectorAll);

const CanvasRenderingContext2D_p_getImageData           =               _call.bind(          _.CanvasRenderingContext2D   .prototype    .getImageData);
const CanvasRenderingContext2D_p_putImageData           =               _call.bind(          _.CanvasRenderingContext2D   .prototype    .putImageData);
const Elemet_p_remove                                   = window     && _call.bind(          _.Element                    .prototype    .remove);
const Function_p_toString                               =               _call.bind(          _.Function                   .prototype    .toString); // TODO: Function.prototype.toSource (firefox), Object.prototype.toString
const HTMLCanvasElement_p_getContext                    = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .getContext);
const HTMLCanvasElement_p_toBlob                        = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .toBlob);
const HTMLCanvasElement_p_toDataURL                     = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .toDataURL);
const HTMLCanvasElement_p_mozGetAsFile                  = window     && _call.bind(          _.HTMLCanvasElement          .prototype    .mozGetAsFile);
const MutationObserver_p_observe                        = window     && _call.bind(          _.MutationObserver           .prototype    .observe);
const Node_p_cloneNode                                  = window     && _call.bind(          _.Node                       .prototype    .cloneNode);
const Node_p_insertBefore                               = window     && _call.bind(          _.Node                       .prototype    .insertBefore);
const Set_p_has                                         =               _call.bind(          _.Set                        .prototype    .has);
const WeakMap_p_get                                     =               _call.bind(          _.WeakMap                    .prototype    .get);
const WeakMap_p_has                                     =               _call.bind(          _.WeakMap                    .prototype    .has);
const WeakMap_p_set                                     =               _call.bind(          _.WeakMap                    .prototype    .set);
const WebGLRenderingContext_p_readPixels                =               _call.bind(          _.WebGLRenderingContext      .prototype    .readPixels);
const XMLHttpRequest_p_open                             =               _call.bind(          _.XMLHttpRequest             .prototype    .open);

/**
 * Getters
 */
const TypedArray_p_get_length                           =               _call.bind(getGetter(getPrototypeOf(_.Uint8Array  .prototype),  'length'));
const CustomEvent_p_get_detail                          =               _call.bind(getGetter(_.CustomEvent                .prototype,   'detail'));
const Element_p_get_clientHeight                        = window     && _call.bind(getGetter(_.Element                    .prototype,   'clientHeight'));
const Element_p_get_clientWidth                         = window     && _call.bind(getGetter(_.Element                    .prototype,   'clientWidth'));
const Element_p_get_tagName                             = window     && _call.bind(getGetter(_.Element                    .prototype,   'tagName'));
const Error_p_get_stack                                 =               _call.bind(getGetter(_.Error                      .prototype,   'stack')); // TODO: the stack trace creation in chrome is much more complex than a simple getter
const HTMLCanvasElement_p_get_height                    = window     && _call.bind(getGetter(_.HTMLCanvasElement          .prototype,   'height'));
const HTMLCanvasElement_p_get_width                     = window     && _call.bind(getGetter(_.HTMLCanvasElement          .prototype,   'width'));
const HTMLElement_p_get_offsetHeight                    = window     && _call.bind(getGetter(_.HTMLElement                .prototype,   'offsetHeight'));
const HTMLElement_p_get_offsetWidth                     = window     && _call.bind(getGetter(_.HTMLElement                .prototype,   'offsetWidth'));
const HTMLIFrameElement_p_get_contentDocument           = window     && _call.bind(getGetter(_.HTMLIFrameElement          .prototype,   'contentDocument'));
const HTMLIFrameElement_p_get_contentWindow             = window     && _call.bind(getGetter(_.HTMLIFrameElement          .prototype,   'contentWindow'));
const HTMLScriptElement_p_get_src                       = window     && _call.bind(getGetter(_.HTMLScriptElement          .prototype,   'src'));
const ImageData_p_get_data                              =               _call.bind(getGetter(_.ImageData                  .prototype,   'data'));
const Node_p_get_parentNode                             = window     && _call.bind(getGetter(_.Node                       .prototype,   'parentNode'));
const Set_p_get_size                                    = window     && _call.bind(getGetter(_.Set                        .prototype,   'size'));


const console = (console => {
	const clone = { };
	forEach([ 'log', 'trace', 'error', 'info', ], key => clone[key] = bind(console[key], console));
	return clone;
})(_.console);

const notImplemented = function notImplemented() {
	throw new Error('not implemented');
};

const log = function log() {
	console.log.apply(console, arguments); return arguments[arguments.length - 1];
};

function getGetter(proto, prop) {
	const desc = getOwnPropertyDescriptor(proto, prop);
	return desc && desc.get || function() { return this[prop]; };
}
