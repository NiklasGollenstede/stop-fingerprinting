(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { notifications, applications: { current, gecko, }, },
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

}); })();
