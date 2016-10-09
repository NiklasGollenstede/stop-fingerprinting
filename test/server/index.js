(() => { 'use strict';
/* globals __dirname, __filename, module, exports, process, global */

const Express = require('express');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');
const {
	concurrent: { async, promisify, },
	fs: { FS, Path, },
	functional: { log, },
	network: { mimeTypes, },
} = require('es6lib');

const CSP = require('./csp.js');

const Server = module.exports = async(function*({
	host = 'localhost',
	origins = null,
	httpPorts = [ 80, ],
	httpsPorts = [ 443, 4430, 4431, 4432, 4433, ],
	upgradePorts = { 8080: 443, },
	certPath = './cert/test',
	debug = true,
} = { }) {

const https = httpsPorts.length && {
	key: FS.readFile(Path.resolve(__dirname, certPath +'.key'), 'utf8'),
	cert: FS.readFile(Path.resolve(__dirname, certPath +'.crt'), 'utf8'),
};

const app = Express();

// log
debug && app.all('/*', (r, x, n) => (console.log(r.method, r.hostname + r.url, r.xhr ? 'xhr' : '', joinHeaders(r.rawHeaders)), n()));

// serve favicon
app.use(require('serve-favicon')(__dirname + './../../icons/default/32.png'));

// employ CSP
CSP(app, { origins, });

// serve files
app.use(Express.static(__dirname +'./../clinent/'));
app.use('/fingerprintjs2.js', Express.static(__dirname +'./../../node_modules/fingerprintjs2/fingerprint2.js'));



/**
 ** Startup
 **/

const eventToPromise = require('event-to-promise');
const listen = (server, port) => eventToPromise(server.listen(port), 'listening').then(() => server);
const Https = require('https'), Http = require('http');

if (https) {
	https.key = (yield https.key);
	https.cert = (yield https.cert);

	// https
	this.https = (yield Promise.all(httpsPorts.map(port => {
		const server = Https.createServer(https, app);
		return listen(server, port);
	})));

	// upgrade
	this.upgrade = (yield Promise.all(Object.keys(upgradePorts).map(from => {
		const to = upgradePorts[from];
		const server = Https.createServer(Express().use((req, res) => {
			const target = 'https://' + req.get('host').replace(from, to) + req.url;
			debug && console.log('redirect to', target);
			res.redirect(target);
		}));
		return listen(server, from);
	})));
}

// http
this.http = (yield Promise.all(httpPorts.map(port => {
	const server = Https.createServer(app);
	return listen(server, port);
})));

return this;
});

Server.prototype.close = function() {
	const servers = [].concat(this.https, this.upgrade, this.http);
	if (!servers.length) { return; }
	const close = promisify(servers[0].close);
	return Promise.all(servers.map(_ => close.call(_)));
};

function joinHeaders(raw) {
	return '\n'+ raw.map((s, i) => (i % 2 ? '' : '\t') + s + (i % 2 ? '\n' : '=')).join('');
}

if (require.main === module) {
	global.Server = Server;
	module.exports = new Server()
	.then(server => (console.log('Started server'), server))
	.catch(error => { console.error(error); process.exitCode = 1; throw error; });
}

})();
