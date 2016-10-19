/* globals
	define, makeNamedGetter, makeNamedSetter,
	forEach,
*/

/**
 * screen.js:
 */

if (!profile.screen) { break file; }

const props = [ 'top', 'left', 'height', 'width', 'colorDepth', 'availTop', 'availLeft', 'availHeight', 'availWidth', 'pixelDepth', ];
define('Screen.prototype', screen => forEach(props,
	prop => prop in profile.screen && (screen[prop] = { get: makeNamedGetter(prop, function() { return profile.screen[prop]; }), })
));

define('self', {
	devicePixelRatio: {
		get: makeNamedGetter('devicePixelRatio', function( ) { return profile.screen.devicePixelRatio; }),
		set: makeNamedSetter('devicePixelRatio', function(v) { }), // TODO: let it be set but (optionally ?) overwrite it when the tabs zoom changes
	},
});
// TODO: make window.outerWidth/height match .inner...

// TODO: ScreenOrientation.prototype, .onmozorientationchange and .mozOrientation (which is === .orientation.type ?)
