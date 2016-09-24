'use strict'; /* global module */

/**
 * Specifies the values to write in the native manifests.
 */

// the ports the app will listen on
const portNumbers = [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ];

// general manifest.json
const general = {
	name: 'stop_fingerprint_echo_server.v1',
	description: `http echo server to allow for synchronous requests from content scripts to the background script via XHRs`,
	// path: 'TBD', // the path will be set later
	type: 'stdio', // mandatory
};
// keys needed for chrome
const chrome = {
	allowed_origins: [ // lists the urls of all extensions that chrome will allow to connect
		`chrome-extension://obebhpicmdheoacdbidiegcomljjacpm/`,
	],
};
// keys needed for firefox
const firefox = {
	allowed_extensions: [ // lists the ids of all extensions that firefox will allow to connect
		'@stop-fingerprinting',
	],
};


module.exports = { portNumbers, general, chrome, firefox, };
