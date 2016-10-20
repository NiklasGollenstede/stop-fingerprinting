'use strict'; /* globals __dirname, __filename, module, process */ // license: MPL-2.0

const packageJson = require('./package.json');

// files from '/' to be included in /webextension/
const webExtFiles = {
	'.': [
		'background/',
		'common/',
		'content/',
		'icons/',
		'ui/',
		'LICENSE',
	],
	node_modules: {
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
			'.': [ 'utils.js', ],
			chrome: [
				'index.js',
			],
			options: [
				'index.js',
				'editor.js',
				'editor-dark.css',
				'editor-layout.css',
			],
			tabview: [
				'index.js',
			],
			update: [
				'index.js',
			],
		},
	},
};

const webExtManifestJson = {
	manifest_version: 2,
	name: packageJson.title,
	short_name: packageJson.title,
	version: packageJson.version,
	author: packageJson.author,
	license: packageJson.license,
	description: packageJson.description,

	icons: { 64: 'icons/default/64.png', }, // TODO: read from dir

	// minimum_chrome_version: '51.0.0',
	applications: {
		gecko: {
			id: '@'+ packageJson.name,
			strict_min_version: '51.0',
		}
	},

	permissions: [
		'browsingData',
		'notifications',
		'nativeMessaging',
		'storage',
		'tabs',
		'webRequest',
		'webRequestBlocking',
		'webNavigation',
		'*://*/*'
	],
	optional_permissions: [ ],

	background: { page: 'background/index.html', },
	content_scripts: [
		{
			matches: [ '<all_urls>' ], // doesn't match amo (in firefox)
			match_about_blank: false,
			all_frames: false, // injection into sub_frames is done from the main_frame
			run_at: 'document_start',
			js: [
				'content/get-api.js',
				'node_modules/es6lib/port.js',
				'content/files.js',
				'content/index.js'
			]
		}
	],
	browser_action: {
		default_title: 'Stop Fingerprinting',
		default_popup: 'ui/panel/index.html',
	},
	options_ui: {
		page: 'ui/home/index.html#options',
		open_in_tab: true,
	},
	web_accessible_resources: [ ], // must be empty

	run_update: { // options for the es6lib/update module
		'base_path': '/update/'
	},

	seleniun_setup_port: null, // set later if building for a selenium test

	incognito: 'spanning', // firefox doesn't support anything else
};

// files from '/' to be included in '/'
const sdkRootFiles = [
	'LICENSE',
	'README.md',
];

// files from '/sdk/' to be included in '/'
const sdkFiles = [
	'content/',
	'attach.js',
	'index.js',
];

const sdkPackageJson = {
	name: packageJson.name,
	title: packageJson.title,
	description: packageJson.description,
	icon: packageJson.icon,
	version: packageJson.version,
	license: packageJson.license,
	author: packageJson.author,
	repository: packageJson.repository,

	engines: {
		firefox: ">=51.0",
	},
	permissions: {
		multiprocess: true,
		'private-browsing': true,
	},
	hasEmbeddedWebExtension: true,
};

const {
	concurrent: { async, spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
} = require('es6lib');
const { join, relative, resolve, dirname, basename, } = require('path');

const fsExtra = require('fs-extra');
const copy = promisify(fsExtra.copy);
const remove = promisify(fsExtra.remove);
const writeFile = promisify(fsExtra.outputFile);

const buildContent = async(function*(options) {
	(yield require('./content/build.js')(options));
	console.log('/content/index.js created');
});

const buildIcons = async(function*(options) {
	const iconNames = (yield require('./icons/build.js')(options));
	console.log('created icons: "'+ iconNames.join('", "') +'"');
});

const buildTldJS = async(function*(options) {
	const { data, list, } = (yield require('./node_modules/get-tld/build-node.js')(options));
	console.log(`./node_modules/get-tld/index.js created/updated (${ list.length } => ${ data.length } bytes)`);
});

const buildUpdate = async(function*(options) {
	const outputJson = promisify(require('fs-extra').outputJson);
	for (let component of (yield FS.readdir(resolve(__dirname, `update`)))) {
		const names = (yield FS.readdir(resolve(__dirname, `update/${ component }`)))
		.filter(_=>_ !== 'versions.json')
		.map(path => basename(path).slice(0, -3));
		(yield outputJson(resolve(__dirname, `update/${ component }/versions.json`), names));
	}
	console.log('wrote version info');
});

const copyFiles = async(function*(files, from, to) {
	const paths = [ ];
	(function addPaths(prefix, module) {
		if (Array.isArray(module)) { return paths.push(...module.map(file => join(prefix, file))); }
		Object.keys(module).forEach(key => addPaths(join(prefix, key), module[key]));
	})('.', files);

	(yield Promise.all(paths.map(path =>
		copy(join(from, path), join('build', to, path))
		.catch(error => console.warn('Skipping missing file/folder "'+ path +'"'))
	)));
});

const build = module.exports = async(function*(options) {
	const outputName = packageJson.title.toLowerCase().replace(/[^a-z0-9\.-]+/g, '_') +'-'+ packageJson.version;

	const trueisch = value => value === undefined || value;

	(yield Promise.all([
		trueisch(options.content) && buildContent(options.content || { }),
		trueisch(options.icons)   &&   buildIcons(options.icons   || { }),
		trueisch(options.tld)     &&   buildTldJS(options.tld     || { }),
		trueisch(options.update)  &&  buildUpdate(options.update  || { }),
		(yield remove(resolve(__dirname, './build'))),
	]));

	// write all resolutions of the default icon
	webExtManifestJson.icons = (yield FS.readdir(resolve(__dirname, 'icons/default/')))
	.reduce((obj, name) => ((obj[name.split('.')[0]] = 'icons/default/'+ name), obj), { });

	// for selenium test, write the setupPort to the manifest.json
	options.selenium && (webExtManifestJson.seleniun_setup_port = options.selenium.setupPort);

	(yield Promise.all([
		copyFiles(webExtFiles, '.', 'webextension'),
		copyFiles(sdkRootFiles, '.', '.'),
		copyFiles(sdkFiles, 'sdk', '.'),
		writeFile(resolve(__dirname, './build/package.json'), JSON.stringify(sdkPackageJson, null, '\t', 'utf8')),
		writeFile(resolve(__dirname, './build/webextension/manifest.json'), JSON.stringify(webExtManifestJson, null, '\t', 'utf8')),
	]));

	if (options.selenium) { // change the main module for selenium tests
		const path = resolve(__dirname, './build/webextension/background/index.html');
		const main = (yield writeFile(path, (yield FS.readFile(path, 'utf8')).replace(/data-main="\.\/"/g, 'data-main="./selenium"')));
	}

	const jpm = 'node "'+ resolve(__dirname, './node_modules/jpm/bin/jpm') +'"';
	const run = command => execute(command, { cwd: __dirname +'/build', });

	if (options.xpi || (!options.run && !options.post && !options.zip)) {
		console.log((yield run(jpm +' xpi')).replace(packageJson.name, outputName));
		(yield FS.rename(`./build/${ packageJson.name }.xpi`, `./build/${ outputName }.xpi`));
	}
	if (options.run) {
		console.log((yield run(jpm +' run'+ (options.run.bin ? ' -b "'+ options.run.bin  +'"' : ''))));
	}
	if (options.post) {
		console.log((yield run(jpm +' post --post-url "'+ (options.post.url || 'http://localhost:8888/') +'"')));
	}
	if (options.zip) {
		(yield promisify(require('zip-dir'))('./build/webextension', {
			filter: path => !(/\.(?:zip|xpi)$/).test(path),
			saveTo: `./build/${ outputName }.zip`,
		}));
		console.log('wrote WebExtension zip to', `./build/${ outputName }.zip`);
	}

	return outputName;
});


if (require.main === module) {
	module.exports = build(require('json5').parse(process.argv[2] || '{ }'))
	.then(name => (console.log('Build done:', name), name))
	.catch(error => { console.error(error); process.exitCode = 1; throw error; });
}
