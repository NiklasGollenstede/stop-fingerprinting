

// executed in the target global context itself with 'context' and 'context.originals' expanded in the surrounding scope (s.o.)
function createAPIs() {
	const {
		TypeError, DOMException,
		Promise, Promise: { resolve: Resolve, },
		Symbol, Symbol: { iterator, toStringTag, },
	} = self;






	// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
	define('HTMLIFrameElement.prototype', { // TODO: check in these (expensive) handlers are necessary
		contentWindow: { get: hideCode(function() {
			const window = call(HTMLIFrameElement_p.get_contentWindow, this);
			if (window) { try {
				fakeAPIs(window);
			} catch (error) { console.error('fakeAPIs in get contentWindow failed', error); } }
			return window;
		}), },
		contentDocument: { get: hideCode(function() {
			const document = call(HTMLIFrameElement_p.get_contentDocument, this);
			if (document) { try {
				fakeAPIs(document.defaultView);
			} catch (error) { console.error('fakeAPIs in get contentDocument failed', error); } }
			return document;
		}), },
	});
	// TODO: window.frames

	// navigator.mediaDevices.enumerateDevices
	if (options.devices.hideAll) {
		define('MediaDevices.prototype', {
			enumerateDevices: { value: hideCode(function enumerateDevices() { return Resolve([ ]); }), },
		});
		define('MediaStreamTrack', {
			getSources: { value: hideCode(function getSources(cb) { MediaStreamTrack.getSources(function() { call(cb, this, [ ]); }); }), },
		});
	}

	{ // everything that changes the navigator object
		const navigator = { };

		// navigator string values
		if (options.navigator) {
			forEach(keys(values.navigator), prop => navigator[prop] = { get: hideCode(function() { return values.navigator[prop]; }), enumerable: true, configurable: true, add: true, });
			forEach(keys(values.navigator.undefinedValues), prop => navigator[prop] = { delete: true, });
			delete navigator.undefinedValues;
		}

		// navigator.plugins
		if (options.plugins.hideAll) {
			const PluginArray = hideCode(function PluginArray() { throw new TypeError('Illegal constructor'); });
			assign(PluginArray.prototype, hideAllCode({
				item() { return null; },
				namedItem() { return null; },
				refresh() { return; },
			}));
			defineProperties(PluginArray.prototype, {
				length: { get: hideCode(function() { return 0; }), enumerable: true, configurable: true, },
				[iterator]: { value: hideCode(function values() { return [][iterator](); }), writable: true, enumerable: false, configurable: true, },
				[toStringTag]: { value: 'PluginArray', writable: false, enumerable: false, configurable: true, },
			});
			const pluginArrayInstance = create(PluginArray.prototype);
			navigator.plugins = { get: hideCode('get plugins', function() { return pluginArrayInstance; }), };
			define('self', { PluginArray: { value: PluginArray, }, });

			// navigator.mimeTypes
			const MimeTypeArray = hideCode(function MimeTypeArray() { throw new TypeError('Illegal constructor'); });
			assign(MimeTypeArray.prototype, hideAllCode({
				item() { return null; },
				namedItem() { return null; },
			}));
			defineProperties(MimeTypeArray.prototype, {
				length: { get: hideCode(function() { return 0; }), enumerable: true, configurable: true, },
				[iterator]: { value: hideCode(function values() { return [][iterator](); }), writable: true, enumerable: false, configurable: true, },
				[toStringTag]: { value: 'MimeTypeArray', writable: false, enumerable: false, configurable: true, },
			});
			const mimeTypeArrayInstance = create(MimeTypeArray.prototype);
			navigator.mimeTypes = { get: hideCode('get mimeTypes', function() { return mimeTypeArrayInstance; }), };
			define('self', { MimeTypeArray: { value: MimeTypeArray, }, });
		}

		// navigator.sendBeacon
		navigator.sendBeacon = { value: hideCode(function sendBeacon(arg) {
			if (!arguments.length) { throw new TypeError('Not enough arguments to Navigator.sendBeacon.'); }
			return true;
		}), };

		define('Navigator.prototype', navigator);
		define('WorkerNavigator.prototype', navigator);
	}

	// BroadcastChannel (firefox only)
	define('BroadcastChannel.prototype', { // TODO: make it optional
		postMessage: { value: hideCode(function postMessage(a) {
			// TODO: arguments/this error handling
		}), },
	});

	// performance.navigation
	define('PerformanceNavigation.prototype', { // TODO: make it optional
		type: { get: hideCode('get type', function() { return 0; }), },
		toJSON: { value: hideCode(function toJSON() { return { type: 0, redirectCount: this.redirectCount, }; }), },
	});

	// workers
	forEach([ '', 'Shared', ], shared => {
		const ctorName = shared +'Worker';
		const Original = originals[ctorName +'_p'].constructor;
		if (!Original) { return; }
		const Worker = hideCode(ctorName, function(url) {
			if (!new.target) { throw new TypeError(`Constructor ${ ctorName } requires 'new'`); }
			if (!arguments.length) { throw new TypeError(`Not enough arguments to ${ ctorName }.`); }
			if (options.misc.disableChildBlobUrl && test((/^blob:/), url)) {
				throw new DOMException (`Failed to construct '${ ctorName }': Access to the script at '${ url }' is denied by the document's Content Security Policy.`);
			}

			console.log('caught worker construction');
			const blob = new Blob([ `(() => {
				const script = (${ getScriptSource() });
				(`+ ((options, workerOptions) => {
					script.call(self, options, script, workerOptions);

					try {
						self.importScripts(workerOptions.entryUrl); // chrome ignores the CSP here
					} catch (error) {
						throw new (typeof NetworkError !== 'undefined' ? NetworkError : DOMException)(`Failed to load worker script at "${ url }"`);
					}
				}) +`)(
					JSON.parse(\`${ stringify(options) }\`),
					{
						entryUrl: "${ new URL(url, location) }",
						name: decodeURI("${ encodeURI(shared && arguments[1] || '') }"),
					}
				);
			})()`, ]);

			const blobUrl = createObjectURL(blob);
			setTimeout(() => revokeObjectURL(blobUrl), 10);

			return construct(Original, [ blobUrl, ], new.target);
		});
		defineProperty(Worker, 'prototype', { value: Original.prototype, });

		define('self', {
			[ctorName]: { value: Worker, },
		});
	});

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
				return apply(WorkerGlobalScope_p.importScripts, this, map(arguments, url => new URL(url, locationString)));
			}), },
		});
		define('XMLHttpRequest.prototype', {
			open: { value: hideCode(function open(a, b) {
				if (arguments.length >= 2) { arguments[1] = new URL(arguments[1], locationString); }
				return apply(XMLHttpRequest_p.open, this, arguments);
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

	return apis;
}

