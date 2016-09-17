'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname */

const {
	concurrent: { async, promisify, },
	fs: { FS, Path, },
} = require('es6lib');

const getBody = require('raw-body');

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();
const { expect, } = chai;

const { Builder, By: { css: $, }, until, } = require('selenium-webdriver');
const { Options, } = require('selenium-webdriver/chrome');

const builder = new Builder()
.forBrowser('chrome')
.setChromeOptions(
	new Options()
	.addArguments(`load-extension=${ Path.resolve(__dirname, '../../') }`)
)
.disableEnvironmentOverrides();

const HttpServer = require('../server/index.js');

describe('Stop Fingerprinting', (function() {
	this.timeout(15000);
	const ctx = { };

	const enableSetUp = async(function*() {
		// start a web server which the extension will contact during startup
		const port = JSON.parse((yield FS.readFile(Path.resolve(__dirname, '../../manifest.json'), 'utf8'))).seleniun_setup_port;
		return new Promise((resolve, reject) => {
			require('http').createServer(function({ url, body, }, out) {
				switch (url.slice(1)) {
					case 'get-storage': {
						out.write(JSON.stringify(ctx.storage || { }));
						console.log('get-storage', ctx.storage);
					} break;
					case 'statup-done': {
						ctx.hasStarted();
					} break;
					case 'statup-failed': {
						getBody(arguments[0])
						.catch(() => '<unknown>')
						.then(error => ctx.hasNotStarted(new Error('Failed to start extension: '+ error)));
					} break;
					default: {
						console.error('request to unknown path:', url);
						out.writeHead(404);
					}
				}
				out.end();
			})
			.listen(port, function(error) { error ? reject(error) : resolve(this); });
		});
	});

	const build = async(function*(options = { }) {
		ctx.storage = options.storage;
		const done = new Promise((resolve, reject) => { ctx.hasStarted = resolve; ctx.hasNotStarted = reject; });
		const driver = ctx.driver = (yield builder.buildAsync());
		(yield done);
		return driver;
	});

	before(async(function*() {
		ctx.setUpServer = (yield enableSetUp());
		ctx.httpServer = (yield new HttpServer());
	}));

	beforeEach(async(function*() {
	}));

	afterEach(async(function*() {
		ctx.driver && (yield ctx.driver.quit());
		ctx.driver = null;
		ctx.storage = null;
	}));

	after(async(function*() {
		(yield promisify(ctx.setUpServer.close).call(ctx.setUpServer));
		ctx.setUpServer = null;
		(yield ctx.httpServer.close());
		ctx.httpServer = null;
	}));

	it('start with options', async(function*() {
		const port = ctx.httpServer.https[0].address().port;
		const driver = (yield build({ storage: { sync: { '<default>.rules.screen.devicePixelRatio': [ 8, ], }, }, }));
		(yield driver.get(`https://localhost:${ port }/`));
		expect((yield driver.executeScript(() => window.devicePixelRatio))).to.equal(8);
	}));
}));
