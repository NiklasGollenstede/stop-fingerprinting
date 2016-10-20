(() => { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/concurrent': { async, sleep, spawn, },
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/chrome/': { runtime: { connect, }, applications: { gecko, }, },
}) {

if (!gecko) { return null; }

const port = new Port(connect({ name: 'sdk', }), Port.web_ext_Port);

const handlers = {
	start() {
		return require.main.promise.then(() => 'started');
	},
};
port.addHandlers(handlers);


const actions = {
	getPref: port.request.bind(port, 'getPref'),
};

return actions;

}); })();
