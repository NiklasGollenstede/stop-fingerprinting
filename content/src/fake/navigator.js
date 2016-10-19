/* globals
	define, makeIlligalCtor, makeGetter, makeMethod,
	forEach, keys, assign, defineProperties, create, TypeError,
	$iterator, $toStringTag,
*/

/**
 * This file contains all modifications to the window.navigator object and related .prototypes.
 */

const navigator = { };

// navigator string values
if (profile.navigator) {
	forEach(keys(profile.navigator), prop => navigator[prop] = {
		get: makeGetter(function() { return profile.navigator[prop]; }),
		add: true, // add if non-existing
		enumerable: true, configurable: true, // needs to set enumerable and configurable when adding
	});
	forEach(keys(profile.navigator.undefinedValues), prop => navigator[prop] = { delete: true, });
	delete navigator.undefinedValues;
}

if (profile.plugins.hideAll) {
	// modifying the existsing instances doesn't work because it has non-deletable (numberical) properties

	// navigator.plugins
	const PluginArray = makeIlligalCtor('PluginArray');
	defineProperties(PluginArray.prototype, { // TODO: fix the .length of thse:
		item:           { value: makeMethod(function item()      { throw new Erorr('YOLO'); }),            writable: true,  enumerable: true,  configurable: true, },
		namedItem:      { value: makeMethod(function namedItem() { return null; }),            writable: true,  enumerable: true,  configurable: true, },
		refresh:        { value: makeMethod(function refresh()   { return; }),                 writable: true,  enumerable: true,  configurable: true, },
		length:         {   get: makeGetter(function length()    { return 0; }),                                enumerable: true,  configurable: true, },
		[$iterator]:    { value: makeMethod(function values()    { return [][$iterator](); }), writable: true,  enumerable: true,  configurable: true, }, // TODO: Array_p_$iterator(newArray)
		[$toStringTag]: { value: 'PluginArray',                                                writable: true,  enumerable: true,  configurable: true, },
	});
	const pluginArrayInstance = create(PluginArray.prototype);
	navigator.plugins = { get: makeGetter(function plugins() { return pluginArrayInstance; }, x => x), };
	define('self', { PluginArray: { value: PluginArray, }, });

	// navigator.mimeTypes
	const MimeTypeArray = makeIlligalCtor('MimeTypeArray');
	defineProperties(MimeTypeArray.prototype, {
		item:           { value: makeMethod(function item()      { return null; }),            writable: true,  enumerable: true,  configurable: true, },
		namedItem:      { value: makeMethod(function namedItem() { return null; }),            writable: true,  enumerable: true,  configurable: true, },
		length:         {   get: makeGetter(function length()    { return 0; }),                                enumerable: true,  configurable: true, },
		[$iterator]:    { value: makeMethod(function values()    { return [][$iterator](); }), writable: true,  enumerable: true,  configurable: true, }, // TODO: Array_p_$iterator(newArray)
		[$toStringTag]: { value: 'MimeTypeArray',                                              writable: true,  enumerable: true,  configurable: true, },
	});
	const mimeTypeArrayInstance = create(MimeTypeArray.prototype);
	navigator.mimeTypes = { get: makeGetter(function mimeTypes() { return mimeTypeArrayInstance; }, x => x), };
	define('self', { MimeTypeArray: { value: MimeTypeArray, }, });
}

// navigator.sendBeacon
navigator.sendBeacon = { value: makeMethod(function sendBeacon(arg) {
	if (!arguments.length) { throw new TypeError('Not enough arguments to Navigator.sendBeacon.'); }
	return true;
}), };

define('Navigator.prototype', navigator);
define('WorkerNavigator.prototype', navigator);
