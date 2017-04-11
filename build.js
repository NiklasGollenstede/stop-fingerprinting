/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, require, __dirname, process, */ // license: MPL-2.0

const packageJson = require('./package.json');

// files from '/' to be included in '/'
const sdkRootFiles = [
	'LICENSE',
	'README.md',
];

// files from '/sdk/' to be included in '/'
const sdkFiles = [
	'./',
];

const sdkPackageJson = {
	name: packageJson.name,
	title: packageJson.title,
	description: packageJson.description,
	icon: 'webextension/'+ packageJson.icon,
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
	concurrent: { async, promisify, },
	functional,
	fs: { FS, },
	process: { execute, },
} = require('es6lib');
const { join, resolve, } = require('path');

const webExtBuild = require('web-ext-build');
const fsExtra = require('fs-extra');
const copy = promisify(fsExtra.copy);
const remove = promisify(fsExtra.remove);
const writeFile = promisify(fsExtra.outputFile);

let log = function() { return arguments[arguments.length - 1]; };

const buildContent = async(function*(options) {
	(yield require('./content/build.js')(options));
	log('/content/index.js created');
});

const buildIcons = async(function*(options) {
	const iconNames = (yield require('./icons/build.js')(options));
	log('created icons: "'+ iconNames.join('", "') +'"');
});

const buildTldJS = async(function*(options) {
	const { data, list, } = (yield require('./node_modules/get-tld/build-node.js')(options));
	log(`./node_modules/get-tld/index.js created/updated (${ list.length } => ${ data.length } bytes)`);
});

const buildWebExt = async(function*(options) {
	const config = options.webExt || { };
	config.outDir = options.outDir || resolve(__dirname, './build') +'/webextension';
	config.chrome = true; // some debugging is actually more comfortable in chrome

//	// for selenium test, write the setupPort to the manifest.json
//	options.selenium && (webExtManifestJson.seleniun_setup_port = options.selenium.setupPort);

	(yield webExtBuild(config));
	log('built WebExt');
});

const copyFiles = async(function*(files, from, to) {
	const paths = [ ];
	(function addPaths(prefix, module) {
		if (Array.isArray(module)) { return void paths.push(...module.map(file => join(prefix, file))); }
		Object.keys(module).forEach(key => addPaths(join(prefix, key), module[key]));
	})('.', files);

	(yield Promise.all(paths.map(path =>
		copy(join(from, path), join(to, path))
		.catch(error => console.warn('Skipping missing file/folder "'+ path +'"', error))
	)));
});

const build = module.exports = async(function*(options) {
	const outputName = packageJson.title.toLowerCase().replace(/[^a-z0-9\.-]+/g, '_') +'-'+ packageJson.version;
	const outDir = options.outDir || resolve(__dirname, './build');

	const trueisch = value => value === undefined || value;

	(yield Promise.all([
		trueisch(options.content) && buildContent(options.content || { }),
		trueisch(options.icons)   &&   buildIcons(options.icons   || { }),
		trueisch(options.tld)     &&   buildTldJS(options.tld     || { }),
		(!options.outDir || options.clearOutDir) && (yield remove(outDir)),
	]));

	(yield Promise.all([
		buildWebExt(options),
		copyFiles(sdkRootFiles, '.', join(outDir, '.')),
		copyFiles(sdkFiles, 'sdk', join(outDir, '.')),
		writeFile(join(outDir, 'package.json'), JSON.stringify(sdkPackageJson, null, '\t', 'utf8')),
	]));

	const jpm = 'node "'+ resolve(__dirname, 'node_modules/jpm/bin/jpm') +'"';
	const run = command => execute(command, { cwd: outDir, });

	if (options.xpi || (options.xpi !== false && !options.run && !options.post && !options.zip)) {
		log((yield run(jpm +' xpi')).replace(packageJson.name, outputName));
		(yield FS.rename(join(outDir, packageJson.name +'.xpi'), join(outDir, outputName +'.xpi')));
	}
	if (options.run) {
		log((yield run(jpm +' run'+ (options.run.bin ? ' -b "'+ options.run.bin  +'"' : ''))));
	}
	if (options.post) {
		const url = options.post.url
		? typeof options.post.url === 'number' ? 'http://localhost:'+ options.post.url +'/' : options.post.url
		: 'http://localhost:8888/';
		log((yield run(jpm +' post --post-url "'+ url +'"')));
	}
	if (options.zip) {
		(yield promisify(require('zip-dir'))('./build/webextension', {
			filter: path => !(/\.(?:zip|xpi)$/).test(path),
			saveTo: join(outDir, outputName +'.zip'),
		}));
		log('wrote WebExtension zip to', join(outDir, outputName +'.zip'));
	}

	return outputName;
});


if (require.main === module) {
	log = functional.log; // enable logging
	module.exports = build(require('json5').parse(process.argv[2] || '{ }'))
	.then(name => log('Build done:', name))
	.catch(error => { console.error(error); process.exitCode = 1; throw error; });
}
