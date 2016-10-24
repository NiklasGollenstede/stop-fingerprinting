'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, expect */

const {
	concurrent: { async, sleep, },
} = require('es6lib');

const { error: { WebDriverError, }, } = require('selenium-webdriver');

const Test = require('.');

describe('These tests should', (function() {
	let test, browser, port;
	Test.register({
	}, async(function*(_test) {
		test = _test;
		browser = (yield test.start({ storage: { sync: {
			'<default>.rules.screen.devicePixelRatio': [ { from: 8, to: 8, }, ],
			'options.debug': [ true, ],
		}, }, }));
		port = test.server.http[0].address().port;
	}));

	it('start with options', async(function*() {
		test.server.files = {
			'index.html': '',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));

	it(`serve virtual files for '/'`, async(function*() {
		test.server.files = {
			'index.html': '<script>test = 23</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.test))).to.equal(23);
	}));

	it('serve virtual files', async(function*() {
		test.server.files = {
			'index2.html': '<script>test = 42</script>',
		};

		(yield browser.get(`http://localhost:${ port }/index2.html`));
		expect((yield browser.executeScript(() => window.test))).to.equal(42);
	}));

	it('serve changing virtual files', async(function*() {
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

	it('not serve real files', async(function*() {
		test.server.files = null;

		(yield () => browser.get(`http://localhost:${ port }/`).should.eventuelly.throw(WebDriverError));
		// expect((yield browser.executeScript(() => window.document.title))).to.not.equal('Stop Fingerprinting Test');
	}));

	it('navigate to about:blank', async(function*() {
		test.server.files = {
			'index.html': '<script>document.title = "blob"</script>',
		};

		(yield browser.get(`http://localhost:${ port }/`));
		(yield browser.get('about:blank'));
		expect((yield browser.executeScript(() => window.document.title))).to.not.equal('blob');
	}));

	it('log requests', async(function*() {

	}));

}));

describe('Stop Fingerpriting should apply to', (function() {
	let test, browser, port;
	Test.register({
	}, async(function*(_test) {
		test = _test;
		browser = (yield test.start({ storage: { sync: {
			'<default>.rules.screen.devicePixelRatio': [ { from: 8, to: 8, }, ],
			'options.debug': [ true, ],
		}, }, }));
		port = test.server.http[0].address().port;
	}));

	it('http: URLs', async(function*() {
		test.server.files = { 'index.html': '', };
		(yield browser.get(`http://localhost:${ port }/`));
		expect((yield browser.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));

	it('data: URLs', async(function*() {
		(yield browser.get(`data:text/html,<script>temp = devicePixelRatio</script>`));
		expect((yield browser.executeScript(() => window.temp))).to.equal(8);
	}));

}));
