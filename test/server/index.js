(() => { 'use strict'; /* globals __dirname, __filename, module, exports, process, global, Buffer, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

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
	log: logger = console.log,
	serveFromFS = true,
	favicon = true,
} = { }) {

this.serveFromFS = serveFromFS;

const https = httpsPorts.length && {
	key: FS.readFile(Path.resolve(__dirname, certPath +'.key'), 'utf8'),
	cert: FS.readFile(Path.resolve(__dirname, certPath +'.crt'), 'utf8'),
};

const app = Express();

// employ CSP
CSP(app, { origins, });

// handle favicons before the logging to ignore them
favicon === 'ignore' && app.use(require('serve-favicon')(__dirname + './../../icons/default/32.png'));

// log
app.all('/*', (r, _, next) => {
	logger(
		r.method +' '+ r.url +' '
		+ r.protocol.toUpperCase() +'/'+ r.httpVersion + (r.xhr ? ' xhr' : '')
		+ joinHeaders(r.rawHeaders)
	);
	next();
});

// by default log favicons after logging them
favicon && app.use(require('serve-favicon')(__dirname + './../../icons/default/32.png'));

app.get('/', ({ url, }, reply, next) => {
	url === '/' && (url = '/index.html');

	const file = this.files && this.files[url.slice(1)];
	if (typeof file !== 'string' && !(file instanceof Buffer)) { return next(); }

	const mimeType = mimeTypes[url.match((/\.[^\\\/]{1,20}$/) || [ ])[0]];
	reply.writeHead(200, mimeType && {
		'content-type': mimeType,
	});
	reply.end(file);
});

// serve files
const ifFiles = handler => (a, b, next) => {
	if (this.serveFromFS) { return handler(a, b, next); }
	next();
};
app.use(ifFiles(Express.static(__dirname +'./../clinent/')));
app.use('/fingerprintjs2.js', ifFiles(Express.static(__dirname +'./../../node_modules/fingerprintjs2/fingerprint2.js')));

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
		const server = Http.createServer(Express().use((req, res) => {
			const target = 'https://' + req.get('host').replace(from, to) + req.url;
			// console.log('redirect to', target);
			res.redirect(target);
		}));
		return listen(server, from);
	})));
}

// http
this.http = (yield Promise.all(httpPorts.map(port => {
	const server = Http.createServer(app);
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
	module.exports = new Server(require('json5').parse(process.argv[2] || '{ }'))
	.then(server => (console.log('Started server'), server))
	.catch(error => { console.error(error); process.exitCode = 1; throw error; });
}

})();
