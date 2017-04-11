/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, require, __dirname, */ // license: MPL-2.0

const { FS, Path, } = require('es6lib/fs');

module.exports = function*({ options, /*packageJson,*/ manifestJson, files, }) {

	manifestJson.permissions.push(
		'browsingData',
		'contextualIdentitities',
		'cookies',
		'notifications',
		'nativeMessaging',
		'tabs',
		'webRequest',
		'webRequestBlocking',
		'webNavigation',
		'<all_urls>'
	);

	manifestJson.browser_action.default_popup = 'view.html?w=220&h=206#panel'; // set size for Private Window panel fallback
	manifestJson.browser_action.default_icon = manifestJson.icons =
	(yield FS.readdir(Path.resolve(__dirname, 'icons/default/')))
	.reduce((obj, name) => ((obj[name.split('.')[0]] = 'icons/default/'+ name), obj), { });
	options.favicon = manifestJson.icons[64];

	manifestJson.options_ui.open_in_tab = true;
	manifestJson.background.persistent = true;

	manifestJson.seleniun_setup_port = null; // TODO: set if building for a selenium test


	files['.'].push('icons/');

	files.node_modules = {
		es6lib: [
			'concurrent.js',
			'dom.js',
			'functional.js',
			'index.js',
			'namespace.js',
			'network.js',
			'object.js',
			'port.js',
			'require.js',
			'string.js',
		],
		'get-tld': [
			'index.js',
		],
		'regexpx': [
			'index.js',
		],
		'web-ext-utils': {
			'.': [
				'browser/',
				'loader/',
				'options/',
				'tabview/',
				'utils/',
				'update/',
			],
		},
	};

};
