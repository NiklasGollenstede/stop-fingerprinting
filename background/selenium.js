(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { notifications, runtime, Storage, applications: { current, gecko, }, },
	'node_modules/es6lib/network': { HttpRequest, },
	require,
	module,
}) {

// for selenium tests this script is automatically set as the main module instead of ./index.js
const port = runtime.getManifest().seleniun_setup_port; // set by the selenium build options

// load the sdk-conection to prevent timeout; no need to wait for it, though
gecko && require.async('./sdk-conection');

// report possible error during startup
module.promise
// .then(() => console.log('selenium bootstrap done'))
.catch(error => {
	HttpRequest(`http://localhost:${ port }/statup-failed`, { method: 'post', body: error && (error.stack || error.message) || error, });
	throw error;
});

// get options
const options = JSON.parse((yield HttpRequest(`http://localhost:${ port }/get-options`)).response);
(yield Storage.local.clear());
(yield Storage.sync.clear());
if (options.storage) {
	const { local, sync, } = options.storage;
	local && (yield Storage.local.set(local));
	sync && (yield Storage.sync.set(sync));
}

// start extension
(yield require.async('background/index'));

// report success
(yield HttpRequest(`http://localhost:${ port }/statup-done`));

}); })();
