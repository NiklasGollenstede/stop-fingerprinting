/* globals
	options, window
*/
/* globals
	define, currentGlobal
*/

// remove window.name
if (options.windowName && options.misc.main_frame === true && currentGlobal === window) { // TODO: test
	define('self', {
		name: { value: '', },
	});
}
