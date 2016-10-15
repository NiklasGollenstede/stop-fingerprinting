'use strict'; /* globals process, __filename, global, Buffer */

// TODO: adjust for MAC / Linux

Error.stackTraceLimit = Infinity; // get them all ...

const { spawn, async, promisify, } = require('es6lib/concurrent');
const { FS, Path, }                = require('es6lib/fs');
const { debounce, }                = require('es6lib/functional');
const Port                         = require('es6lib/port');
const { execute, }                 = require('es6lib/process');
const dialog = require('dialog');
const fs = require('fs');

const isBinary = process.argv[0].endsWith('node.exe'); // TODO: won't work for MAC / Linux, not reliable

// path of the folder that contains the current native binary, or the index.js script
const folder = Path.resolve(isBinary ? process.argv[1].endsWith('.js') ? process.argv[1] +'/..' : process.argv[1] : process.argv[0] +'/..');

// command line arguments
const args = process.argv.slice(2);

// whether the program was started by a browser or not
const startedByBrowser = args.some(arg => (/^chrome-extension:\/\/|firefox\.json$/).test(arg)); // chrome sends "chrome-extension://"... as arg, firefox the path to the manifest (firefox.json)

// can't log to stdio if started by the browser ==> log to './log.txt'.
if (startedByBrowser || true) {
	const logFile = fs.createWriteStream(Path.resolve(folder, './log.txt'));
	process.stdout._write = process.stderr._write = logFile._write.bind(logFile);
	const console = new (require('console').Console)(logFile, logFile);
	require('console-stamp')(console, {
		pattern: 'yyyy-mm-dd HH:MM:ss.l',
		label: true,
		stdout: logFile, stderr: logFile,
	});
	Object.defineProperty(global, 'console', { get() { return console; }, });
	Object.defineProperty(process, 'stdout', { get() { return logFile; }, });
	Object.defineProperty(process, 'stderr', { get() { return logFile; }, });
}

const manifests = require('./manifests');
const portNums = manifests.portNumbers;

const install = {
	windows(useBat) {
		const targetPath = Path.resolve(folder, useBat ? 'index.js' : 'native.exe');
		const binPath = Path.resolve(folder, './native.'+ (useBat ? 'bat' : 'exe'));
		const chromePath = Path.resolve(folder, './chrome.json');
		const firefoxPath = Path.resolve(folder, './firefox.json');
		return Promise.all([
			FS.access(targetPath),
			FS.writeFile(chromePath,  JSON.stringify(Object.assign({ path: binPath, }, manifests.general, manifests.chrome),  null, '\t'), 'utf8'),
			FS.writeFile(firefoxPath, JSON.stringify(Object.assign({ path: binPath, }, manifests.general, manifests.firefox), null, '\t'), 'utf8'),
			useBat && FS.writeFile(binPath, `node index.js %*`, 'utf8'),
			execute(`REG ADD "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${ manifests.general.name }" /ve /t REG_SZ /d "${ chromePath }" /f`),
			execute(`REG ADD "HKCU\\Software\\Mozilla\\NativeMessagingHosts\\${ manifests.general.name }"        /ve /t REG_SZ /d "${ firefoxPath }" /f`),
		]);
	},
	// TODO: MAC / Linux
};
const uninstall = {
	windows() {
		return Promise.all([
			execute(`REG ADD "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${ manifests.general.name }" /f`).catch(_=>_),
			execute(`REG ADD "HKCU\\Software\\Mozilla\\NativeMessagingHosts\\${ manifests.general.name }"        /f`).catch(_=>_),
		]);
	},
	// TODO: MAC / Linux
};

const startServer = async(function*(Handler, permanent) {
	const eventToPromise = require('event-to-promise'), certs = require('./cert.js');
	const Https = require('https'), WebSocketServer = require('ws').Server;

	let httpsS; for (const port of portNums) { try {
		const server = Https.createServer(certs, function() {
			handler.onRequest && handler.onRequest.apply(handler, arguments);
		});
		(yield eventToPromise(server.listen(port), 'listening'));
		httpsS = server; break;
	} catch (error) {
		console.error(`Https server skipping port ${ port }`, error);
	} }

	if (!httpsS) { throw new Error(`Https server failed to listen to any port: ${ portNums }`); }
	const portNumber = httpsS.address().port;

	const wsS = new WebSocketServer({ server: httpsS, });

	wsS.on('connection', socket => addPort(socket));

	const ports = new Set;

	function addPort(socket) {
		const port = new Port(socket);
		ports.add(port);
		handler.onConnect && handler.onConnect(port);
		socket.on('close', removePort.bind(null, port));
	}

	function removePort(port) {
		ports.delete(port);
		handler.onDisconnect && handler.onDisconnect(port);
		shutdown();
	}

	const shutdown = debounce(async(function*() {
		if (ports.size) { return; }
		let cancel = false; try {
			if ((yield handler.onBeforeExit && handler.onBeforeExit()) === false) { cancel = true; }
		} catch (error) { console.error(error); }
		!cancel && process.exit(0);
	}), 3000);

	const handler = new Handler({
		portNumber, permanent,
		startedByBrowser, folder,
		isBinary, args,
	});

	shutdown();
});

spawn(function*() {

	if (startedByBrowser) { // start server, allow to exit when all connections are closed
		const main = (yield require('./main'));
		(yield startServer(main, false));
		// process.stdout.write(new Buffer(4).fill(0));
		// process.stdout.write(Buffer.concat([ new Buffer([4,0,0,0]), new Buffer('null'), ]));
	} else {
		if (
			args.length === 0 // started from file system / without args
			|| args[0] === 'install' || args[0] === 'i'
		) {
			const os = 'windows'; // TODO: ...
			const dev = args.length >= 2 && args.slice(1).some(arg => arg === '-d' || arg === '--dev'); // install in dev mode
			(yield install[os](dev));
			dialog.info(`Installation for ${ os } at “${ folder }” successful` +(dev ? ' (dev mode)' : ''), 'Stop Fingerprinting');
		} else if (
			args.length >= 1 && args[0] === 'uninstall'
		) {
			const os = 'windows'; // TODO: ...
			(yield uninstall[os]());
			dialog.info(`Uninstallation for ${ os } from “${ folder }” successful`, 'Stop Fingerprinting');
		} else if (
			args.length >= 1 && (args[0] === 'start' || args[0] === 's')
		) {
			const main = (yield require('./main'));
			(yield startServer(main,
				args.length >= 2 && args.slice(1).some(arg => arg === '-p' || arg === '--permanent') // set ctx.permanent to true ==> allow server to keep running when all connections are closed
			));
		} else {
			console.error(`
Start without arguments or with a first arg of 'i' or 'install' to install.
Add '-d' or '--dev' to install in development mode.
Start with 'uninstall' to uninstall.
			`);
		}
	}
})
.catch(error => {
	console.error('Startup failed', error.stack || error);
	dialog.warn(`Operation failed: ${ error.stack || error }`, 'Error: Stop Fingerprinting');
});
