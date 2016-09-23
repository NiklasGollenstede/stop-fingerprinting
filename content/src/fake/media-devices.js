/* globals
	options, resolve, MediaStreamTrack_p_getSources, call
*/
/* globals
	define, currentGlobal, hideCode
*/

// navigator.mediaDevices.enumerateDevices
if (options.devices.hideAll) {
	define('MediaDevices.prototype', {
		enumerateDevices: { value: hideCode(function enumerateDevices() { return resolve([ ]); }), },
	});
	define('MediaStreamTrack', {
		getSources: { value: hideCode(function getSources(cb) { MediaStreamTrack_p_getSources(this, function() { call(cb, this, [ ]); }); }), },
	});
}
