'use strict'; /* globals process, __filename */

const portNums = [ 46344, 35863, 34549, 40765, 48934, 47452, 10100, 5528 ];

const dialog = require('dialog');
const Path = require('path');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const accessPath = promisify(fs.access);
require('es6lib/require');
const { execute, } = require('es6lib/process');
const Port = require('es6lib/port');
const folder = Path.resolve(process.argv[0].endsWith('node.exe') ? process.argv[1].endsWith('.js') ? process.argv[1] +'/..' : process.argv[1] : process.argv[0] +'/..');

const args = process.argv.slice(2);

if (!'ius'.includes(args[0])) {
	const logFile = fs.createWriteStream(Path.resolve(folder, './log.txt'));
	[ 'error', 'info', 'log', 'warn', ]
	.forEach(level => console[level] = (...args) => logFile.write(level +': '+ args.map(_=>JSON.stringify(_)).join(', ') +'\n'));
}

const manifest = {
	name: 'stop_fingerprint_echo_server.v1',
	description: `http echo server to allow for synchronous requests from content scripts to the background script via XHRs`,
	// path: 'TBD',
	type: 'stdio',
};
const chrome = {
	allowed_origins: [
		`chrome-extension://obebhpicmdheoacdbidiegcomljjacpm/`,
	],
};
const firefox = {
	allowed_extensions: [
		'@stop-fingerprinting',
	],
};

const install = {
	windows(useBat) {
		const targetPath = Path.resolve(folder, useBat ? 'index.js' : 'native.exe');
		const binPath = Path.resolve(folder, './native.'+ (useBat ? 'bat' : 'exe'));
		const chromePath = Path.resolve(folder, './chrome.json');
		const firefoxPath = Path.resolve(folder, './firefox.json');
		return Promise.all([
			accessPath(targetPath),
			writeFile(chromePath,  JSON.stringify(Object.assign({ path: binPath, }, manifest, chrome),  null, '\t'), 'utf8'),
			writeFile(firefoxPath, JSON.stringify(Object.assign({ path: binPath, }, manifest, firefox), null, '\t'), 'utf8'),
			useBat && writeFile(binPath, `node index.js`, 'utf8'),
			execute(`REG ADD "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${ manifest.name }" /ve /t REG_SZ /d "${ chromePath }" /f`),
			execute(`REG ADD "HKCU\\Software\\Mozilla\\NativeMessagingHosts\\${ manifest.name }"        /ve /t REG_SZ /d "${ firefoxPath }" /f`),
		]);
	}
};
const uninstall = {
	windows() {
		return Promise.all([
			execute(`REG ADD "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${ manifest.name }" /f`).catch(_=>_),
			execute(`REG ADD "HKCU\\Software\\Mozilla\\NativeMessagingHosts\\${ manifest.name }"        /f`).catch(_=>_),
		]);
	}
};

const startServer = (permanent) => spawn(function*() {
	const eventToPromise = require('event-to-promise'), certs = require('./cert.js');
	const Https = require('https'), WebSocketServer = require('ws').Server;

	function echo(_in, _out) {
		console.log('bouncing', _in.headers['x-nonce']);
		_out.end(_in.headers['x-nonce'] +';'+ _in.headers['x-options']);
	}

	let httpsS; for (const port of portNums) { try {
		const server = Https.createServer(certs, echo);
		(yield eventToPromise(server.listen(port), 'listening'));
		httpsS = server; break;
	} catch (error) {
		console.error(`Echo skipping port ${ port }`, error);
	} }

	if (!httpsS) { throw new Error(`Echo server failed to listen to any port: ${ portNums }`); }
	const echoPort = httpsS.address().port;
	console.log(`Https listening on ${ echoPort }`);

	const wsS = new WebSocketServer({ server: httpsS, });

	wsS.on('connection', socket => addPort(socket));

	const ports = new Set;

	function addPort(socket) {
		console.log('adding socket');
		const port = new Port(socket);
		ports.add(port);
		port.addHandlers({
			getPort() {
				return echoPort;
			},
		});

		socket.on('close', removePort.bind(null, port));
	}

	function removePort(port) {
		ports.delete(port);
		console.log('removing port');
		shutdown();
	}

	const shutdown = debounce(() => {
		if (ports.size) { return; }
		console.log('All connections closed, shutting down now');
		!permanent && process.exit(0);
	}, 3000);

	shutdown();
});

spawn(function*() {

	switch (args[0]) {
		case 'i': {
			(yield install.windows(!args.includes('-n')));
			dialog.info(`Installation at "${ folder }" successful`, 'Stop Fingerprinting');
		} break;
		case 'u': {
			(yield uninstall.windows());
			dialog.info(`Uninstallation from "${ folder }" successful`, 'Stop Fingerprinting');
		} break;
		default: {
			(yield startServer(args[0] === 's'));
			console.log('server started');
		}
	}
})
.catch(error => {
	console.error('Startup failed', error.stack || error);
	dialog.warn(`Operation failed: ${ error.stack || error }`, 'Error: Stop Fingerprinting');
});

function spawn(generator) {
	const iterator = generator();
	const next = arg => handle(iterator.next(arg));
	const _throw = arg => handle(iterator.throw(arg));
	const handle = ({ done, value, }) => done ? Promise.resolve(value) : Promise.resolve(value).then(next, _throw);
	return Promise.resolve().then(next);
}

function promisify(callUlater) {
	return function wrapper(/*arguments*/) {
		return new Promise((resolve, reject) => {
			if (new.target) {
				const self = new callUlater(...arguments, error => error ? reject(error) : resolve(self));
			} else {
				callUlater.call(this, ...arguments, function(err, res) { err ? reject(err) : resolve(res); });
			}
		});
	};
}

function debounce(callback, time) {
	let timer = null;
	return function() {
		clearTimeout(timer);
		timer = setTimeout(callback, time);
	};
}
