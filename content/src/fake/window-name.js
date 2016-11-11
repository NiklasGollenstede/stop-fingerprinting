/* globals
	define, makeGetter, makeSetter,
	window,
*/

/**
 * reset `window.name` of the main frame
 */

const alwaysIsolate = profile.session !== 'browser';

if (
	!profile.windowName
	|| !isMainFrame // TODO: test
	|| isMainFrame && window.opener != null
	&& !(alwaysIsolate || !originIncludes(window.opener.location))
) { break file; }

// The code below keeps the underlying window.name as is (for the better or good, the page will be unable to read/write the actual property).
// So if the page is addressed with a given name instead of '_top' that would probably break
/*
let windowName = '';
define('self', { name: {
	get: makeGetter(function name() { return windowName +''; }),
	set: makeSetter(function name(value) { windowName = value; }),
}, });
*/

// The alternative is to assign the .name once, instead of defining it.
// This however has the effect that an outside observer (e.g. through `window.open()`) sees the property change.
// but since tab isolation is turned on, the references of window.open() and window.opener should be null anyway.

window.name = '';
