'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, expect */

const {
	concurrent: { _async, },
} = require('es6lib');

const Test = require('..');

[ false, true, ].forEach(isFixed => describe(
	isFixed ? `The patched browser doesn't` : 'The browser does',
	(function() {
		let test, browser, ports;
		Test.register({
			noExt: !isFixed,
			server: {
				httpPorts: [ 0, 0, 0, ],
				useCsp: false, // TODO: fix same-origin serving and remove this
			},
		}, _async(function*(_test) {
			test = _test;
			browser = (yield test.start({

			}));
			ports = test.server.http.map(_=>_.address().port);
		}));

		require('fs').readdirSync(__dirname).forEach(name => {
			if (name === 'index.js') { return; }
			const { description, getTest, timeout, } = require('./'+ name);

			it(description, function() {
				timeout && this.timeout(timeout);
				return getTest(isFixed)(test, browser, ports);
			});
		});
	})
));
