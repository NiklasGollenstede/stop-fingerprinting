'use strict'; /* globals process, __dirname */

const now = f => f();

if (!('electron' in process.versions)) { // started as node.js program, launch electron app

	const root = require('path').resolve(__dirname, '../..');

	const electron = require('child_process').spawn(
		require('electron-prebuilt'),
		[ root, '--debug', process.argv.slice(2), ],
		{ cwd: root, env: process.env, detached: true, }
	);

	electron.on('Uncaught Electron error:', function(error) { console.error(error); });

	console.log(`Started electron (${ electron.pid })`);

} else { // started as electron app

	const { app: App, BrowserWindow, } = require('electron');

	const escapeString = _=>_.replace(/([\\\n\$\`\'\"])/g, '\\$1');

	const file = escapeString(require('path').resolve(process.argv[3] ? process.argv[3].replace(/^\.[\\\/]/, __dirname +'/../../') : __dirname +'/index.js'));

	(App.isReady() ? now : App.once.bind(App, 'ready'))(() => {

		let win = new BrowserWindow({ width: 1700, height: 1390, });
		win.loadURL(`data:text/html,<body style="background:#222"><script>
			try {
				const entry = (\`${ file }\`);
				process.argv.splice(1, 0, entry);
				server = require(entry);
			} catch (error) {
				console.error('Uncought', error);
			}
		</script>`);

		win.openDevTools({ detach: false, });
		win.once('closed', () => win = null);

		// install dark devTools theme
		require('electron-devtools-installer').default('bomhdjeadceaggdgfoefmpeafkjhegbo');
	});

}
