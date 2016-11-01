'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, expect */

const {
	concurrent: { _async, sleep, },
} = require('es6lib');

const { error: { WebDriverError, }, } = require('selenium-webdriver');

const Test = require('.');

describe('These tests should', (function() {
	let test, browser, port;
	Test.register({
	}, _async(function*(_test) {
		test = _test;
		browser = (yield test.start({ storage: { sync: {
			'profile.<default>.rules.screen.devicePixelRatio': [ { from: 8, to: 8, }, ],
			'options.debug': [ true, ],
		}, }, }));
		port = test.server.http[0].address().port;
	}));

	it('start with options', _async(function*() {
		test.server.files = {
			'index.html': '',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));

	it(`serve virtual files for '/'`, _async(function*() {
		test.server.files = {
			'index.html': '<script>test = 23</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.test))).to.equal(23);
	}));

	it('serve virtual files', _async(function*() {
		test.server.files = {
			'index2.html': '<script>test = 42</script>',
		};

		(yield browser.get(`http://localhost:${ port }/index2.html`));
		expect((yield browser.executeScript(() => window.test))).to.equal(42);
	}));

	it('serve changing virtual files', _async(function*() {
		test.server.files = {
			'index.html': '<script>test = 1</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.test))).to.equal(1);

		test.server.files = {
			'index.html': '<script>test = 2</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.test))).to.equal(2);
	}));

	it('not serve real files', _async(function*() {
		test.server.files = null;

		(yield () => browser.get(`http://localhost:${ port }/`).should.eventuelly.throw(WebDriverError));
		// expect((yield browser.executeScript(() => window.document.title))).to.not.equal('Stop Fingerprinting Test');
	}));

	it('navigate to about:blank', _async(function*() {
		test.server.files = {
			'index.html': '<script>document.title = "blob"</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		(yield browser.get('about:blank'));
		expect((yield browser.executeScript(() => window.document.title))).to.not.equal('blob');
	}));

	it('log requests', _async(function*() {

	}));

}));

describe('Stop Fingerpriting should apply to', (function() {
	let test, browser, port;
	Test.register({
	}, _async(function*(_test) {
		test = _test;
		browser = (yield test.start({ storage: { sync: {
			'profile.<default>.rules.screen.devicePixelRatio': [ { from: 8, to: 8, }, ],
			'options.debug': [ true, ],
		}, }, }));
		port = test.server.http[0].address().port;
	}));

	it('http: URLs', _async(function*() {
		test.server.files = { 'index.html': '', };
		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));

	xit('data: URLs', _async(function*() { // this currently doesn't work, since there is no network request
		(yield browser.get(`data:text/html,<script>temp = devicePixelRatio</script>`));
		expect((yield browser.executeScript(() => window.temp))).to.equal(8);
	}));

}));
