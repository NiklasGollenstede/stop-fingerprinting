'use strict'; /* globals process, __dirname */

const now = f => f();

if (!('electron' in process.versions)) { // started as node.js program, launch electron app

	var electron = require('child_process').spawn(
		require('electron-prebuilt'),
		[ '.', '--debug', process.argv.slice(2), ],
		{
			cwd: process.cwd(),
			env: process.env,
			detached: true,
		}
	);

	electron.on('error', function(error) { console.error(error); });

	console.log('Sarted electron ('+ electron.pid +')');

} else { // started as electron app

	const { app: App, BrowserWindow, } = require('electron');

	const file = require('es6lib/template/escape').escapeString(process.argv[3] ? process.argv[3].replace(/^\.[\\\/]/, __dirname +'/../../') : __dirname +'/index.js');

	(App.isReady() ? now : App.once.bind(App, 'ready'))(() => {

		let win = new BrowserWindow({ width: 1700, height: 1390, });
		win.loadURL('about:blank');

		win.webContents.executeJavaScript(`
			try {
				server = require('${ file }');
			} catch (error) {
				console.error('Uncought', error);
				// window.close();
				// process.exit(0);
			}
			window.onbeforeunload = () => process.exit(0);
		`);

		win.openDevTools({ detach: false, });
		win.once('closed', () => win = null);
	});

}
