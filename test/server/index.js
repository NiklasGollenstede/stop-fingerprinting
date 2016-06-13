'use strict'; require('es6lib/concurrent').spawn(function*() {
/* globals __dirname, module, exports, process */


const config = process.project_config = {
	host: 'localhost',
	origins: null,
	https: true,
	httpsPort: 443,
	httpPort: 80,
	forceHttps: false,
	certPath: './cert/test',
};


const Express = require('express');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');
const {
	concurrent: { async, promisify, },
	fs: { FS, Path, },
	format: { RegExpX, },
	functional: { log, },
	network: { mimeTypes, },
	polyfill,
} = require('es6lib');

const CSP = require('./csp.js');

const https = config.https && {
	key: FS.readFile(Path.resolve(__dirname, config.certPath +'.key'), 'utf8'),
	cert: FS.readFile(Path.resolve(__dirname, config.certPath +'.crt'), 'utf8'),
};

const app = Express();

// log
app.all('/*', (r, x, n) => (console.log(r.method, r.hostname + (r.originalUrl = r.url), r.xhr ? 'xhr' : '', r.headers), n()));

// serve favicon
app.use(require('serve-favicon')(__dirname + './../../icons/default/32.png'));

// employ CSP
CSP(app);
app.use('/csp', BodyParser.json({ limit: '10kb', type: [ 'application/csp-report', mimeTypes.json, ], }));
app.post('/csp', CSP.onerror);

// serve files
app.use(Express.static(__dirname +'./../clinent/'));



/**
 ** Startup
 **/

if (https) {
	https.key = (yield https.key);
	https.cert = (yield https.cert);

	(yield new Promise((resolve, reject) => {
		module.exports.http = require('https').createServer(https, app)
		.listen(config.httpsPort, error => error ? reject(error) : resolve());
	}));
	config.httpPort && (yield new Promise((resolve, reject) => {
		module.exports.https = config.forceHttps
		? Express().use(
			(req, res) => res.redirect(log('redirect to', 'https://' + req.get('host').replace(config.httpPort, config.httpsPort) + req.url))
		).listen(config.httpPort, error => error ? reject(error) : resolve())
		: app.listen(config.httpPort, error => error ? reject(error) : resolve());
	}));
} else {
	(yield new Promise((resolve, reject) => {
		module.exports.http = app.listen(config.httpPort, error => error ? reject(error) : resolve());
	}));
}

console.log('http://'+ config.host +':'+ config.httpPort +'/');
https && console.log('https://'+ config.host +':'+ config.httpsPort +'/');

}).catch(error => (console.error('Uncaught error', error), process.exit(-1)));
