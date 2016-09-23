/* globals
	options, worker, workerOptions, forEach, keys, WorkerLocation, apply, map, URL, test,
	WorkerGlobalScope_p_importScripts, XMLHttpRequest_p_open
*/
/* globals
	define, currentGlobal, hideCode
*/

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
			return apply(WorkerGlobalScope_p_importScripts, this, map(arguments, url => new URL(url, locationString)));
		}), },
	});
	define('XMLHttpRequest.prototype', {
		open: { value: hideCode(function open(a, b) {
			if (arguments.length >= 2) { arguments[1] = new URL(arguments[1], locationString); }
			return apply(XMLHttpRequest_p_open, this, arguments);
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
