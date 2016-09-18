(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { notifications, runtime, Storage, applications: { current, gecko, }, },
	'node_modules/es6lib/network': { HttpRequest, },
	require,
}) {

// for selenium tests this script needs to be required as the root script instead of ./index.js

const port = runtime.getManifest().seleniun_setup_port;
if (!port || (yield Storage.local.get([ '__update__.local.version', ]))['__update__.local.version']) {
	return require('background/index'); // not selenium test after all, this script should not have been included
}

// report possible error during startup
require('./selenium').catch(error => {
	HttpRequest(`http://localhost:${ port }/statup-failed`, { method: 'post', body: error && (error.stack || error.message) || error, });
	throw error;
});

// get initial storage
let storage; try {
	storage = (yield HttpRequest(`http://localhost:${ port }/get-storage`)).response;
} catch (error) {
	return require('background/index'); // not selenium test after all, this script should not have been included
}
const { local, sync, } = JSON.parse(storage);
(yield Storage.local.set(local || { }));
(yield Storage.sync.set(sync || { }));

// start extension
(yield require('background/index'));

// report success
(yield HttpRequest(`http://localhost:${ port }/statup-done`));

}); })();
