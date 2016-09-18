'use strict'; /* globals process, __dirname, __filename */

const now = f => f();

if (!('electron' in process.versions)) { // started as node.js program, launch electron app
	const exists = (access => path => { try { access(path); return true; } catch(_) { return false; } })(require('fs').accessSync);
	const { resolve, } = require('path');

	const cwd = process.cwd();

	// try to get the project root, i.e. the nearest folder that contains a `package.json`
	const root = (function find(path) {
		if (exists(path +'/package.json')) { return path; }
		const parent = resolve(path, '..');
		if (parent && parent !== path) { return find(parent); }
		return cwd;
	})(cwd);

	let entry = require.resolve(cwd +'/'+ (process.argv[2] || ''));
	if (entry === __filename) { entry = require.resolve(cwd +'/index.js'); }

	const electron = require('child_process').spawn(
		require('electron-prebuilt'),
		[ root, entry, process.argv.slice(3), ],
		{ cwd: cwd, env: process.env, detached: true, }
	);

	electron.on('Uncaught Electron error:', function(error) { console.error(error); });

	console.log(`Started electron (${ electron.pid }) with "${ entry }"`);

} else { // started as electron app

	const { app: App, BrowserWindow, } = require('electron');

	const entry = process.argv[2];
	const args = process.argv.slice(3);

	(App.isReady() ? now : App.once.bind(App, 'ready'))(() => {

		let win = new BrowserWindow({ width: 1700, height: 1390, });
		win.once('closed', () => win = null);
		win.openDevTools({ detach: false, });

		win.loadURL(`data:text/html,<body style="background:#222"><script>
			try {
				const entry = (${ JSON.stringify(entry) });
				const args = (${ JSON.stringify(args) });
				process.argv.splice(1, 0, entry, ...args);
				server = require(entry);
			} catch (error) {
				console.error('Uncaught', error);
			}
		</script>`);

		// install dark devTools theme
		require('electron-devtools-installer').default('bomhdjeadceaggdgfoefmpeafkjhegbo');
	});

}
