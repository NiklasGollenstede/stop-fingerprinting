/* globals
	define, makeGetter, makeSetter,
*/

/**
 * reset `window.name` of the main frame
 */

if (
	!profile.windowName
	|| !isMainFrame // TODO: test
	// || !isFirstLoad // TODO: implement
) { break file; }

// The code below keeps the underlying window.name as is (for the better or good, the page will be unable to read/write the actual property).
// The alternative, to assign the .name once, instead of defining it.
// This however would have the effect that an outside observer (e.g. through `window.open()`) would see the property change even though it shouldn't.
// Also, for successful `window.open()` calls the .name of the opened window should remain unchanged (so for the first page load in a tab?, only if !profile.isolateTabs?).

let windowName = '';
define('self', { name: {
	get: makeGetter(function name() { return windowName +''; }),
	set: makeSetter(function name(value) { windowName = value; }),
}, });
