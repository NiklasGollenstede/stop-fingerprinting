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

if (isMainFrame && window.opener != null) { // the tab still has an opener, i.e. it hasn't been reset yet. This is especially true directly after a tab has been open()ed
	if (alwaysIsolate || !originIncludes(window.opener.location)) {
		window.opener = null; // the opener got a null reference from open() too, so we are done here
		// TODO: if the origin rules change, then !this.includes(opener) does not imply !opener.includes(this), so this logic would be wrong. But that's rather unlikely
	} else {
		// let the tab keep it's opener.
		// This is also the only situation where it makes sense (for a main frame) to keep the window.name.
		// The opener got a reference to this tab, the only way to reset that is to close and re-open this tab, so:
		postToBackground('resetOnCrossNavigation'); // once this is set, it may, but doesn't need to be set again. It thus doesn't matter if the page resets its opener
	}
}

