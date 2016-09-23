/* globals
	options, self, window, worker,
	call, dispatchEvent, clz32, forEach, keys, bind, defineProperty,
	CustomEvent, WeakMap, Error,
	CustomEvent_p_get_detail, WeakMap_p_set,
	console, alert,
	injectedSource, applyingSource,
*/
/* globals
	location, globals,
*/
const context = (() => {

const token = options.nonce;
let context;

// search for existing context
if (window) {
	let root = window;
	try { do {
		call(dispatchEvent, root, new CustomEvent('getStopFingerprintingContext$'+ token, { detail: { return(c) { context = c; }, }, }));
	} while (!context && root.parent !== root && (root = root.parent)); } catch (e) { }
	context && console.log('found context', token, context);
	if (context) { return context; }
}
const hiddenFunctions = new WeakMap;

// fake function+'' => [native code]
const hideCode = function hideCode(name, func) {
	if (!func) {
		func = name;
		name = func.name;
	} else {
		defineProperty(func, 'name', { value: name, });
	}
	WeakMap_p_set(hiddenFunctions, func, name || '');
	options.debug && (func.isFaked = true);
	return func;
};

const hideAllCode = function hideAllCode(object) {
	forEach(keys(object), key => typeof object[key] === 'function' && hideCode(object[key]));
	return object;
};

const postMessage = function postMessage(message) {
	call(dispatchEvent, window, new CustomEvent('stopFingerprintingPostMessage$'+ token, { detail: message, }));
};
const notify = function notify(level, what = { }) {
	what.url = context.topUrl;
	if (!window) { console.log('notify', level, what); return; } // TODO: worker
	context.postMessage({ name: 'notify', args: [ level, what, ], });
};
const error = function error(error) {
	alert('Unexpected exception: '+ (error && error.message || error));
	throw error;
};

// create context
context = {
	globals,

	top: self,
	topUrl: location.href,

	get injectedSource() { return injectedSource +''; },
	get applyingSource() { return applyingSource +''; },

	fakes: new WeakMap,

	hiddenFunctions, hideCode, hideAllCode,

	postMessage, notify, error,
};
console.log('created context', token, context);

// 'save' context
window && window.addEventListener('getStopFingerprintingContext$'+ token, event => CustomEvent_p_get_detail(event).return(context));


return context; })();
