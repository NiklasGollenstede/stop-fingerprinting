/* globals
	define,
*/

/**
 * reset `window.name` of the main frame
 */

if (profile.windowName && isMainFrame) { // TODO: test
	define('self', {
		name: { value: '', },
	});
}
