'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, expect */

const {
	concurrent: { async, },
} = require('es6lib');

const Test = require('.');

describe('These tests should', (function() {
	this.timeout(1000);
	const getTest = new Test;
	let test, browser, port;

	before(async(function*() {
		this.timeout(6000);
		test = (yield getTest);
		browser = (yield test.start({ storage: { sync: {
			'<default>.rules.screen.devicePixelRatio': [ { from: 8, to: 8, }, ],
			'options.debug': [ true, ],
		}, }, }));
		port = test.server.http[0].address().port;
	}));

	after(() => test && test.destroy());

	it('start with options', async(function*() {

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));

	it('serve virtual files', async(function*() {
		test.server.files = {
			'index.html': '<script>test=42</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.test))).to.equal(42);
	}));

	it('not serve real files', async(function*() {
		test.server.files = null;

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.document.title))).to.not.equal('Stop Fingerprinting Test');
	}));

}));


describe('Stop Fingerpriting should apply to', (function() {
	this.timeout(1000);
	const getTest = new Test;
	let test, browser, port;

	before(async(function*() {
		this.timeout(6000);
		test = (yield getTest);
		browser = (yield test.start({ storage: { sync: {
			'<default>.rules.screen.devicePixelRatio': [ { from: 8, to: 8, }, ],
			'options.debug': [ true, ],
		}, }, }));
		port = test.server.http[0].address().port;
	}));

	after(() => test && test.destroy());

	it('http: URLs', async(function*() {

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
		(yield browser.get('about:blank'));
	}));

	it('data: URLs', async(function*() {

		(yield browser.get(`data:text/html,<script>temp=devicePixelRatio</script>`));
		expect((yield browser.executeScript(() => window.temp))).to.equal(8);
		(yield browser.get('about:blank'));
	}));

}));
