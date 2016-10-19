/* globals
	define, makeMethod,
*/

// BroadcastChannel (firefox only)
define('BroadcastChannel.prototype', { // TODO: make it optional
	postMessage: { value: makeMethod(function postMessage(a) {
		// TODO: arguments/this error handling
	}), },
});
/* // for testing only
define('self', {
	blub: { value: makeMethod(function blub(a) { return { a, b: [ ], }; }), add: true, },
	blob: { value: makeMethod(function blob(a) { (null).blob; }), add: true, },
});
*/
