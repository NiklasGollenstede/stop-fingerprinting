'use strict'; /* globals describe, it, beforeEach, afterEach, before, after, __dirname, module, global */

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();
global.expect = chai.expect;

const {
	concurrent: { async, spawn, promisify, },
	fs: { FS, Path, },
} = require('es6lib');

const HttpServer = require('../server/index.js');
const buildExt = require('../../build.js');
const extDir = Path.resolve(__dirname, '../../build');

// const makeTempDir = promisify(require('temp')/*.track()*/.mkdir);
const eventToPromise = require('event-to-promise');
const Https = require('https'), Http = require('http');
const getBody = require('raw-body');

const { Builder, } = require('selenium-webdriver');
const Chrome = require('selenium-webdriver/chrome');
const Firefox = require('selenium-webdriver/firefox');


const TestPrototype = {

	// create profile folder, start setup server, build add-on
	constructor: async(function*() {
		(yield this._startSetupServer());

		this.extName = (yield buildExt({
			icons: false, tld: false, // no need to rebuild these every time
			selenium: { setupPort: this.setupPort, },
			xpi: true,
		}));
		this.extPath = Path.join(extDir, this.extName +'.xpi');

		this.httpServer = null;
		this.pendingStartUp = null;
		this.browser = null;
		return this;
	}),

	// start HTTP server
	init: async(function*() {
		if (this.httpServer) { throw new Error('HTTP server already started'); }

		this.httpServer = (yield new HttpServer({
			httpPorts: [ 0, ],
			httpsPorts: [ 0, ],
			upgradePorts: { },
		}));

		(yield this._makeBuilder());
	}),

	// start browser with config, clear server logs
	start: async(function*({ storage, }) {
		if (this.browser || this.pendingStartUp) { throw new Error('Browser already started'); }

		const ctx = this.pendingStartUp = { storage, };
		const done = new Promise((y, n) => { ctx.resolve = y; ctx.reject = n; });
		this.browser = (yield this.builder.buildAsync());
		(yield done);
		this.pendingStartUp = null;

		return this.browser;
	}),

	// close browser, clear server logs
	stop: async(function*() {
		if (this.pendingStartUp) { } // ???
		if (!this.browser) { return; }

		this.browser && (yield this.browser.quit());
		this.browser = null;
	}),

	// stop HTTP server, calls stop()
	uninit: async(function*() {
		(yield this.stop());
		this.httpServer && (yield this.httpServer.close());
		this.httpServer = null;
		// TODO: destroy builder
		this.builder = null;
	}),

	// undo constructor();
	destroy: async(function*() {
		(yield this.uninit());
		this.setUpServer && (yield this.setUpServer.close());
		this.setUpServer = null;
	}),

	_makeBuilder: async(function*() {
		const chromeOpts = new Chrome.Options();
		chromeOpts.addArguments(`load-extension=${ extDir }/webextension`);

		const ffProfile = new Firefox.Profile();
		ffProfile.setPreference('extensions.@stop-fingerprinting.sdk.console.logLevel', 'all');
		ffProfile.setPreference('xpinstall.signatures.required', false);
		ffProfile.setPreference('extensions.checkCompatibility.51.0a', false); // FF51 devEdition
		ffProfile.setPreference('extensions.checkCompatibility.51.0b', false); // FF51 beta
		ffProfile.addExtension(this.extPath);

		const ffOpts = new Firefox.Options();
		// ffOpts.setBinary(new Firefox.Binary().useDevEdition(true));
		ffOpts.setBinary(String.raw`C:\Program Files\Firefox Developer Edition\firefox.exe`);
		ffOpts.setProfile(ffProfile);

		this.builder = new Builder()
		.forBrowser('firefox')
		// .setChromeOptions(chromeOpts)
		.setFirefoxOptions(ffOpts)
		.disableEnvironmentOverrides()
		;
	}),

	// start a web server which the extension will contact during startup
	_startSetupServer: async(function*() {
		this.setupServer = new Http.Server(this._onSetupRequest.bind(this));
		(yield eventToPromise(this.setupServer.listen(0), 'listening'));
		this.setupServer.close = promisify(this.setupServer.close);
		this.setupPort = this.setupServer.address().port;
	}),
	_onSetupRequest({ url, body, }, out) {
		const ctx = this.pendingStartUp;
		switch (url.slice(1)) {
			case 'get-storage': {
				out.write(JSON.stringify(ctx.storage || { }));
				console.log('get-storage', ctx.storage);
			} break;
			case 'statup-done': {
				ctx.resolve();
			} break;
			case 'statup-failed': {
				getBody(arguments[0])
				.catch(() => '<unknown>')
				.then(error => ctx.reject(new Error('Failed to start extension: '+ error)));
			} break;
			default: {
				console.error('request to unknown path:', url);
				out.writeHead(404);
			}
		}
		out.end();
	},
	[Symbol.toStringTag]: 'Test',
};
Object.keys(TestPrototype).forEach(key => Object.defineProperty(TestPrototype, key, { enumerable: false, }));
const Test = TestPrototype.constructor;
Test.prototype = TestPrototype;

Test.register = function(options) {
	let test;

	before(async(function*() {
		test = (yield new Test);
		(yield test.init());
		options.created(test);
	}));

	beforeEach(async(function*() {
	}));

	afterEach(async(function*() {
		(yield test.stop());
	}));

	after(async(function*() {
		(yield test.destroy());
	}));
};

module.exports = Test;
