/* globals
	define, makeMethod,
	Promise_resolve, MediaStreamTrack_p_getSources, call, Array,
*/
/* globals cloneInto, */

if (!profile.devices) { break file; }

// navigator.mediaDevices.enumerateDevices
define('MediaDevices.prototype', {
	enumerateDevices: { value: makeMethod(function enumerateDevices() { return Promise_resolve(cloneInto([ ])); }), },
});
define('MediaStreamTrack', {
	getSources: { value: makeMethod(function getSources(cb) { MediaStreamTrack_p_getSources(this, function() { call(cb, this, cloneInto([ ])); }); }), }, // chrome only
});

