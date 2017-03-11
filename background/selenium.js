(function() { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { runtime, Storage, },
	'node_modules/es6lib/network': { HttpRequest, },
	require,
	module,
}) => {

// for selenium tests this script is automatically set as the main module instead of ./index.js
const port = runtime.getManifest().seleniun_setup_port; // set by the selenium build options

// report possible error during startup
module.ready
// .then(() => console.log('selenium bootstrap done'))
.catch(error => {
	HttpRequest(`http://localhost:${ port }/statup-failed`, { method: 'post', body: error && (error.stack || error.message) || error, });
	throw error;
});

// get options
const options = JSON.parse((await HttpRequest(`http://localhost:${ port }/get-options`)).response);
(await Storage.local.clear());
(await Storage.sync.clear());
if (options.storage) {
	const { local, sync, } = options.storage;
	local && (await Storage.local.set(local));
	sync && (await Storage.sync.set(sync));
}

// start extension
(await require.async('background/index'));

// report success
(await HttpRequest(`http://localhost:${ port }/statup-done`));

}); })();
