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

const makeTempDir = promisify(require('temp').track().mkdir);
const eventToPromise = require('event-to-promise');
const Https = require('https'), Http = require('http');
const getBody = require('raw-body');

const { Builder, } = require('selenium-webdriver');
const Chrome = require('selenium-webdriver/chrome');
const Firefox = require('selenium-webdriver/firefox');
const { Key, } = require('selenium-webdriver/lib/input');


const TestPrototype = {

	constructor: async(function*({ noExt = false, server, } = { }) {
		if (!noExt) {
			// start a web server which the extension will contact during startup
			this.setupServer = new Http.Server(this._onSetupRequest.bind(this));
			(yield eventToPromise(this.setupServer.listen(0), 'listening'));
			this.setupServer.close = promisify(this.setupServer.close);
			this.setupPort = this.setupServer.address().port;

			// build add-on and create a firefox builder with it
			this.tempDir = (yield makeTempDir('add-on-build'));
			this.extName = (yield buildExt({
				icons: false, tld: false, // no need to rebuild these every time
				selenium: { setupPort: this.setupPort, },
				xpi: true,
				outDir: this.tempDir,
			}));
			this.extPath = Path.join(this.tempDir, this.extName +'.xpi');
		}
		this._makeBuilder();

		const log = this.serverLogs = [ ];
		this.server = (yield new HttpServer(Object.assign({
			httpPorts: [ 0, ],
			httpsPorts: [ 0, ],
			upgradePorts: { },
			log(header) { log.push(header); },
			serveFromFS: false,
			favicon: 'ignore',
		}, server)));

		this.pendingStartUp = null; // holds a PromiseCapability with additional options while the browser is starting
		this.browser = null; // reference to the browser driver, while it runs
		return this;
	}),

	// start browser with config, wait for the add-on to have started, clear server logs
	start: async(function*({ storage, }) {
		if (this.browser || this.pendingStartUp) { throw new Error('Browser already started'); }

		const ctx = this.pendingStartUp = { options: { storage, token: Math.random().toString(36).slice(2), }, };
		const done = ctx.promise = this.setupServer ? new Promise((y, n) => { ctx.resolve = y; ctx.reject = n; }) : Promise.resolve();
		this.browser = (yield this.builder.buildAsync());
		(yield done);
		this.pendingStartUp = null;
		this.takeLogs();
		return this.browser;
	}),

	// close browser, clear server logs
	stop: async(function*() { // TODO: add 'force' option
		this.pendingStartUp && (yield this.pendingStartUp.promise);
		this.browser && (yield this.browser.quit());
		this.browser = null;
		this.takeLogs();
	}),

	// stop servers, calls .stop(true)
	destroy: async(function*() {
		(yield this.stop(true));
		this.server && (yield this.server.close());
		this.server = null;
		this.setupServer && (yield this.setupServer.close());
		this.setupServer = null;
		// TODO: destroy builder
		this.builder = null;
	}),

	takeLogs() {
		return this.serverLogs.splice(0, Infinity);
	},
	peekLogs() {
		return this.serverLogs.slice(0, Infinity);
	},
/*
	openTab: async(function*(url) {
		(yield this.browser.executeScript('window.open()')); console.log('opened');
		// TODO: wait?
		(yield this.focusTab()); console.log('focused');
		url != null && (yield this.browser.get(url)); console.log('navigated');
	}),
	focusTab: async(function*(index) {
		const tabs = (yield this.browser.getAllWindowHandles()); console.log('tabs', tabs);
		index = index == null ? tabs.length - 1 : index < 0 ? tabs.length - 1 + length : length;
		index = Math.max(0, Math.min(index, tabs.length - 1)); console.log('index', index);
		(yield this.browser.switchTo().window(tabs[index]));
	}),
	closeTab: async(function*(index) {
		index != null && (yield this.focusTab(index));
		(yield this.browser.close());
		// (yield this.browser.executeScript('window.close()'));
		(yield this.focusTab(0));
	}),
*/
	_makeBuilder: (function() {
		const chromeOpts = new Chrome.Options();
		chromeOpts.addArguments(`load-extension=${ this.tempDir }/webextension`);

		const ffProfile = new Firefox.Profile();

		this.extPath && ffProfile.addExtension(this.extPath);
		ffProfile.setPreference('extensions.@stop-fingerprinting.sdk.console.logLevel', 'all');
		ffProfile.setPreference('xpinstall.signatures.required', false); // allow unsigned add-on (requires alpha/devEdition/unbranded build)
		ffProfile.setPreference('extensions.checkCompatibility.51.0a', false); // FF51 devEdition
		ffProfile.setPreference('extensions.checkCompatibility.51.0b', false); // FF51 beta

		// disable all caching, for now this is an acceptable way to handle caching in these tests,
		// but it needs to be removed once this extension affects caching itself
		ffProfile.setPreference('browser.cache.disk.enable', false);
		ffProfile.setPreference('browser.cache.memory.enable', false);
		ffProfile.setPreference('browser.cache.offline.enable', false);
		ffProfile.setPreference('network.http.use-cache', false);

		// these don't seem to work
		ffProfile.setAcceptUntrustedCerts(true);
		ffProfile.setAssumeUntrustedCertIssuer(true);

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

	_onSetupRequest({ url, body, }, out) {
		const ctx = this.pendingStartUp;
		switch (ctx && url.slice(1)) {
			case 'get-options': {
				if (ctx.options) {
					out.write(JSON.stringify(ctx.options));
				} else {
					out.writeHead(404);
				}
				ctx.options = null;
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

Test.register = function(options, done) {
	let test, getTest = new Test(options);

	before(async(function*() {
		this.timeout(6000);
		test = (yield getTest);
		(yield done(test));
	}));

	beforeEach(async(function*() {
	}));

	afterEach(async(function*() {
		test.server.files = null;
		(yield test.browser.get('about:blank'));
		test.takeLogs();
	}));

	after(async(function*() {
		(yield test.destroy());
	}));
};

module.exports = Test;
