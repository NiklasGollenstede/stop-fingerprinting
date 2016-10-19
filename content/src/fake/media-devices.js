/* globals
	hideCode, define, resolve, MediaStreamTrack_p_getSources, call, Array,
*/

// navigator.mediaDevices.enumerateDevices
if (!profile.devices) { break file; }

define('MediaDevices.prototype', {
	enumerateDevices: { value: makeMethod(function enumerateDevices() { return resolve([ ]); }, x => x), }, // TODO: check the returned Promise
});
define('MediaStreamTrack', {
	getSources: { value: hideCode(function getSources(cb) { MediaStreamTrack_p_getSources(this, function() { call(cb, this, new Array); }); }), },
});

