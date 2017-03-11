/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, require, __dirname, */ // license: MPL-2.0

const { FS, Path, } = require('es6lib/fs');

module.exports = function*({ options, /*packageJson,*/ manifestJson, files, }) {

	manifestJson.permissions.push(
		'browsingData',
		'notifications',
		'nativeMessaging',
		'tabs',
		'webRequest',
		'webRequestBlocking',
		'webNavigation',
		'<all_urls>'
	);

	manifestJson.browser_action.default_popup = 'view.html#panel?w=220&h=206';
	manifestJson.browser_action.default_icon = manifestJson.icons =
	(yield FS.readdir(Path.resolve(__dirname, 'icons/default/')))
	.reduce((obj, name) => ((obj[name.split('.')[0]] = 'icons/default/'+ name), obj), { });
	options.favicon = manifestJson.icons[64];
	console.log('icon', manifestJson.icons[64]);

	manifestJson.options_ui.open_in_tab = true;
	manifestJson.background.persistent = true;

	manifestJson.content_scripts = [
		{
			matches: [ '<all_urls>', ], // doesn't match amo (in firefox)
			match_about_blank: false,
			all_frames: false, // injection into sub_frames is done from the main_frame
			run_at: 'document_start',
			js: [
				'content/get-tab-id.js',
			],
		},
	];

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
				'utils/',
			],
			tabview: [
				'index.js',
			],
			update: [
				'index.js',
			],
		},
	};

};
