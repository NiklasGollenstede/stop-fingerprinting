'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, expect */

const {
	concurrent: { async, },
} = require('es6lib');

const Test = require('.');

describe('Stop Fingerpriting should', (function() {
	this.timeout(15000);
	let test; Test.register({
		created(_) { test = _; },
	});

	it('start with options', async(function*() {
		const port = test.httpServer.http[0].address().port;
		const browser = (yield test.start({ storage: { sync: {
			'<default>.rules.screen.devicePixelRatio': [ 8, ],
		}, }, }));
		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));

}));
