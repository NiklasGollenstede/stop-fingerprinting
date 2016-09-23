'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, expect */

const {
	concurrent: { async, },
} = require('es6lib');

require('.')('Stop Fingerpriting should', function(ctx) {
	it('start with options', async(function*() {
		const port = ctx.httpServer.https[0].address().port;
		const driver = (yield ctx.build({ storage: { sync: { '<default>.rules.screen.devicePixelRatio': [ 8, ], }, }, }));
		(yield driver.get(`https://localhost:${ port }/`));
		expect((yield driver.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));
});
