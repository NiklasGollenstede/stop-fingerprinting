'use strict'; /* globals __dirname, process */ // license: MPL-2.0

const include = {
	'.': [
		'background/',
		'common/',
		'content/',
		'icons/',
		'ui/',
		'LICENSE',
		'manifest.json',
		'package.json',
		'README.md',
	],
	node_modules: {
		es6lib: [
			'require.js',
			'namespace.js',
			'object.js',
			'functional.js',
			'concurrent.js',
			'dom.js',
			'format.js',
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
		},
	},
};

const args = process.argv.length > 2 ? process.argv.slice(2) : [ '-x', '-z', '-i', '-t', ];

const {
	concurrent: { async, spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
} = require('es6lib');

const buildIcons = async(function*(...args) {
	const iconNames = (yield require('./icons/build')(...args));
	console.log('created icons: "'+ iconNames.join('", "') +'"');
});

const buildTldJS = async(function*(...args) {
	const { data, tlds, } = (yield require('./background/tld/build.js')(...args));
	console.log(`background/tld/index.js created (${ tlds.reduce((c, s) => c + s.length, 0) } => ${ data.length } bytes)`);
});

spawn(function*() {

(yield Promise.all([
	args.includes('-i') && buildIcons(),
	args.includes('-t') && buildTldJS(),
]));

const [ _package, _manifest, ] = (yield Promise.all([ FS.readFile('package.json', 'utf8'), FS.readFile('manifest.json', 'utf8'), ])).map(JSON.parse);
[ 'title', 'version', 'author', ]
.forEach(key => {
	if (_manifest[key] && _package[key] !== _manifest[key]) { throw new Error('Key "'+ key +'" mismatch (package.json, manifest.json)'); }
});

const outputName = _package.title.toLowerCase().replace(/[^a-z0-9\.-]+/g, '_') +'-'+ _package.version +'.xpi';

if (args.includes('-x')) {
	const { join, relative, resolve, dirname, } = require('path');

	const paths = [ ];
	function addPaths(prefix, module) {
		if (Array.isArray(module)) { return paths.push(...module.map(file => join(prefix, file))); }
		Object.keys(module).forEach(key => addPaths(join(prefix, key), module[key]));
	}

	addPaths('.', include);

	const copy = promisify(require('fs-extra').copy);
	const remove = promisify(require('fs-extra').remove);
	(yield Promise.all(paths.map(path => copy(path, join('tmp', path)))));

	(yield execute('node '+ resolve(...'/node_modules/web-ext/bin/web-ext'.split(/\//g)) +' build --source-dir ./tmp --artifacts-dir .'/*, { env: process.env, }*/));

	(yield remove('./tmp'));
}

})
.then(() => console.log('Build done'))
.catch(error => console.error('Error during build', error.stack || error) === process.exit(-1));
