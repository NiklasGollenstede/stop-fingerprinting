/* globals
	options, forEach, keys, values, assign, defineProperties, iterator, toStringTag, create
*/
/* globals
	hideCode, hideAllCode, define, currentGlobal, context
*/

const { TypeError, } = currentGlobal;

// everything that changes the navigator object
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
