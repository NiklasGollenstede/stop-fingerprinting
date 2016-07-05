define('background/request', function() { 'use strict'; // license: MPL-2.0

const ignore = Symbol('ignore');
const reset = Symbol('ignore');

class RequestListener {
	constructor(Handler, filter = { urls: [ '<all_urls>', ], }, options = { }) {
		const listeners = this.listeners = { }, handlers = this.handlers = { };
		Object.getOwnPropertyNames(Handler.prototype).forEach(event => (/^on[A-Z]/).test(event) && on(event));
		!listeners.onCompleted && on('onCompleted');
		!listeners.onErrorOccurred && on('onErrorOccurred');

		function on(event) {
			if (!chrome.webRequest[event]) { return; }

			chrome.webRequest[event].addListener(
				listeners[event] = [ 'onCompleted', 'onErrorOccurred', ].includes(event)
				? Handler.prototype[event] ? fireAndDone : done : fire,
				filter, ...(options[event] ? [ options[event], ] : [ ])
			);

			function fireAndDone() {
				const value = fire.apply(null, arguments);
				done.apply(null, arguments);
				return value;
			}

			function fire({ requestId, url }) {
				let handler = handlers[requestId];
				if (handler === ignore) { return; }
				if (!handler) { try {
					handler = handlers[requestId] = new Handler(...arguments);
				} catch (error) {
					switch (error) {
						case ignore: handlers[requestId] = ignore; console.log('skip request', url); break;
						case reset: done(arguments[0]); console.log('skip handler', event, url); break;
						default: console.error('Uncaught error during handler construction', error);
					}
					return;
				} }
				try {
					return handler[event](...arguments);
				} catch (error) {
					switch (error) {
						case ignore: handlers[requestId] = ignore; console.log('skip request', url); break;
						case reset: done(arguments[0]); console.log('skip handler', event, url); break;
						default: console.error('Uncaught error in "'+ event +'" handler', error);
					}
				}
			}
		}

		function done({ requestId, }) {
			destroy(handlers[requestId]);
			delete handlers[requestId];
		}
	}

	destroy() {
		Object.keys(this.handlers).forEach(destroy);
		Object.keys(this.listeners).forEach(event => chrome.webRequest[event].removeListener(this.listeners[event]));
	}
}
RequestListener.ignore = ignore;
RequestListener.reset = reset;

function destroy(obj) { obj && obj.destroy && obj.destroy(); }

return RequestListener;

});
