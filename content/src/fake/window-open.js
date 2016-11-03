/* globals
	define, makeNamedMethod,
	window, open,
*/

/**
 * Remove references between .open() and .opener
 */

isMainFrame && (window.opener = null);
define('self', { open: { value: makeNamedMethod('open', function() { open(...arguments); return null; }), }, });
// The code below is how it *should* work, but implementing a fix for the TODO would be quite complex.
// For now it's far easier to always reset the opener references.
break file;


const alwaysIsolate = profile.session !== 'browser';

// always return null from window.open()

define('self', { open: {
	value: makeNamedMethod('open', function() {
		const ref = open(...arguments);
		console.log('opened', ref, alwaysIsolate, !originIncludes(arguments[0]));
		if (alwaysIsolate || !originIncludes(arguments[0])) { return null; }
		return ref;
	}),
}, });
// TODO: this is still insufficient, if a ta has a reference to another same origin tab and that tab then navigates cross-origin, then the tab has a reference to a cross-origin tab (the returned ref follows navigations)
// ==> in the background, save that a tab has an active opener relation and if it navigates cross-origin, close that tab and load the navigation target into a new (cloned) tab
// once that is done, the block below should only run once per tab, directly after is was opened


if (
	isMainFrame && window.opener != null
	&& (pageLoadCount > 1 || alwaysIsolate || !originIncludes(window.opener.location)) // not first load or should isolate
) {
	window.opener = null;
}

