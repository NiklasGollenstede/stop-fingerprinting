/* globals
	define, hideCode,
*/

// BroadcastChannel (firefox only)
define('BroadcastChannel.prototype', { // TODO: make it optional
	postMessage: { value: hideCode(function postMessage(a) {
		// TODO: arguments/this error handling
	}), },
});
/*
define('self', {
	blub: { value: hideCode(function blob(a) { return { a, b: [ ], p: Promise.resolve(42), }; }), add: true, },
});
*/
