/* globals
	hideCode, define, resolve, MediaStreamTrack_p_getSources, call, Array,
*/

// navigator.mediaDevices.enumerateDevices
if (!profile.devices) { break file; }

define('MediaDevices.prototype', {
	enumerateDevices: { value: hideCode(function enumerateDevices() { return resolve([ ]); }), },
});
define('MediaStreamTrack', {
	getSources: { value: hideCode(function getSources(cb) { MediaStreamTrack_p_getSources(this, function() { call(cb, this, new Array); }); }), },
});

