/* globals
	define, makeNamedMethod,
	window, open,
*/

/**
 * Remove references between .open() and .opener
 */

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


if (
	isMainFrame && window.opener != null
	&& (pageLoadCount > 1 || alwaysIsolate || !originIncludes(window.opener.location)) // not first load or should isolate
) {
	window.opener = null;
}

