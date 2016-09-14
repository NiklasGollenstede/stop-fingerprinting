/* globals
	options, values, keys
*/
/* globals
	hideCode, define, currentGlobal
*/

// screen
if (options.screen) {
	define('Screen.prototype', screen => keys(values.screen).forEach(
		prop => screen[prop] = { get: hideCode(function() { return values.screen[prop]; }), }
	));
	define('self', {
		devicePixelRatio: {
			get: hideCode('get devicePixelRatio', function() { return values.screen.devicePixelRatio; }),
			set: hideCode('set devicePixelRatio', function(v) { }), // TODO: let it be set but (optionally ?) overwrite it when the tabs zoom changes
		},
	});
	// TODO: make window.outerWidth/height match .inner...
}
