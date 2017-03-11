(() => { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { webRequest, },
}) {

const ignore = { toString() { return 'ignore'; }, };
const reset = { toString() { return 'ignore'; }, };

// TODO: If a request is redirected to a data:// URL, onBeforeRedirect is the last reported event.

function RequestListener(filter, options, Handler) {
	const listeners = { }, handlers = { };
	Object.getOwnPropertyNames(Handler.prototype).forEach(event => (/^on[A-Z]/).test(event) && on(event));
	!listeners.onCompleted && on('onCompleted');
	!listeners.onErrorOccurred && on('onErrorOccurred');

	function on(event) {
		if (!webRequest[event]) { return; }

		const listener = listeners[event] = (() => {
			if (![ 'onCompleted', 'onErrorOccurred', ].includes(event)) { return fire; }
			return Handler.prototype[event] ? fireAndDone : done;
		})();

		if (options[event]) {
			webRequest[event].addListener(listener, filter, options[event]);
		} else {
			webRequest[event].addListener(listener, filter);
		}

		function fireAndDone() {
			const value = fire.apply(null, arguments);
			done.apply(null, arguments);
			return value;
		}

		function fire({ requestId, url, }) {
			let handler = handlers[requestId];
			if (handler === ignore) { return; }
			if (!handler) { try {
				handler = handlers[requestId] = new Handler(...arguments);
				if (handler === reset) { done(arguments[0]); console.log('reset', requestId, event, url); return; }
				if (handler === ignore) { done(arguments[0]); handlers[requestId] = ignore; console.log('ignore', requestId, event, url); return; }
			} catch (error) {
				console.error('Uncaught error during handler construction', error);
				return;
			} }
			try {
				let value = handler[event](...arguments);
				if (value === reset) { value = undefined; done(arguments[0]); console.log('reset', requestId, event, url); }
				if (value === ignore) { value = undefined; done(arguments[0]); handlers[requestId] = ignore; console.log('ignore', requestId, event, url); }
				if (typeof value === 'object') {
					if (value.ignore === ignore) {
						delete value.ignore;
						done(arguments[0]);
						handlers[requestId] = ignore;
						console.log('ignoring after', requestId, event, url);
					} else if (value.reset === reset) {
						delete value.reset;
						done(arguments[0]);
						console.log('reset after', requestId, event, url);
					}
				}
				return value;
			} catch (error) {
				console.error(`Uncaught error in "${ event }" handler of`, handler, error);
			}
		}
	}

	function done({ requestId, }) {
		destroy(handlers[requestId]);
		delete handlers[requestId];
	}

	return { destroy() {
		Object.keys(listeners).forEach(event => webRequest[event].removeListener(listeners[event]));
		Object.keys(handlers).forEach(requestId => destroy(handlers[requestId]));
	}, };
}
RequestListener.ignore = ignore;
RequestListener.reset = reset;

function destroy(obj) {
	if (!obj || !obj.destroy) { return; }
	try { obj.destroy(); } catch (error) {
		console.error('Uncaught error during handler destruction', error);
	}
}

return RequestListener;

}); })();
