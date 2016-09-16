(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { notifications, runtime, Storage, applications: { current, gecko, }, },
	'node_modules/es6lib/network': { HttpRequest, },
	'icons/urls': icons,
	current: { now, },
}) {

notifications.create({
	[gecko ? 'type' : 'requireInteraction']: true,
	type: 'basic',
	title: `Stop Fingerprinting installed`,
	message: `Stop Fingerprinting ${ current.replace(/^./, c => c.toUpperCase()) } extension version ${ now } installed`,
	iconUrl: icons.default[256],
});

// get initial storage for selenium tests
const port = runtime.getManifest().seleniun_setup_port;
if (port) {
	const { local, sync, } = JSON.parse((yield HttpRequest(`http://localhost:${ port }/get-storage`)).response);
	(yield Storage.local.set(local || { }));
	(yield Storage.sync.set(sync || { }));
}

}); })();
