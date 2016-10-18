/* globals
	hideCode, define,
	forEach,
*/

/**
 * screen.js:
 */

if (!profile.screen) { break file; }

const props = [ 'top', 'left', 'height', 'width', 'colorDepth', 'availTop', 'availLeft', 'availHeight', 'availWidth', 'pixelDepth', ];
define('Screen.prototype', screen => forEach(props,
	prop => prop in profile.screen && (screen[prop] = { get: hideCode('get '+ prop, function() { return profile.screen[prop]; }), })
));

define('self', {
	devicePixelRatio: {
		get: hideCode('get devicePixelRatio', function() { return profile.screen.devicePixelRatio; }),
		set: hideCode('set devicePixelRatio', function(v) { }), // TODO: let it be set but (optionally ?) overwrite it when the tabs zoom changes
	},
});
// TODO: make window.outerWidth/height match .inner...
