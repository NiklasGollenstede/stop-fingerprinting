'use strict'; /* globals __dirname, __filename, process, module */ // license: MPL-2.0

const {
	concurrent: { async, spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
} = require('es6lib');
const { join, relative, resolve, dirname, basename, } = require('path');
const copy = promisify(require('fs-extra').copy);
const remove = promisify(require('fs-extra').remove);

const _parent = require('../package.json');
const _package = {
	name: _parent.name,
	title: _parent.title,
	description: _parent.description,
	icon: _parent.icon,
	version: _parent.version,
	license: _parent.license,
	author: _parent.author,
	repository: _parent.repository,

	engines: {
		firefox: ">=51.0",
	},
	permissions: {
		multiprocess: true,
		'private-browsing': true,
	},
	hasEmbeddedWebExtension: true,
};


const build = module.exports = async(function*(args) {

	(yield require('../build.js')(args.concat(args)));
	(yield remove(resolve(__dirname, './webextension')));
	(yield copy(resolve(__dirname, '../build/'), resolve(__dirname, './webextension')));
	(yield FS.writeFile(resolve(__dirname, './package.json'), JSON.stringify(_package, null, '\t', 'utf8')));
	{
		const _manifest = require('./webextension/manifest.json');
		delete _manifest.content_scripts;
		(yield FS.writeFile(resolve(__dirname, './webextension/manifest.json'), JSON.stringify(_manifest, null, '\t', 'utf8')));
	}

	if (args.includes('-x')) {
		console.log((yield execute(
			'node "'+ resolve(__dirname, '../node_modules/jpm/bin/jpm') +'" xpi',
			{ cwd: __dirname, }
		)));
	}
	if (args.includes('-r')) {
		const binAt = args.indexOf('-b');
		console.log((yield execute(
			'node "'+ resolve(__dirname, '../node_modules/jpm/bin/jpm') +'" run'
			+ (binAt >= 0 ? ' -b "'+ args[binAt + 1] +'"' : ''),
			{ cwd: __dirname, }
		)));
	}
	if (args.includes('-p')) {
		const next = args[args.indexOf('-p') + 1];
		console.log((yield execute(
			'node "'+ resolve(__dirname, '../node_modules/jpm/bin/jpm') +'" post'
			+' --post-url "'+ (next && next[0] !== '-' ? next : 'http://localhost:8888/') +'"',
			{ cwd: __dirname, }
		)));
	}
});


if (require.main === module) {
	module.exports = build(process.argv.slice(2))
	.then(() => console.log('Build done'))
	.catch(error => { console.error(error); process.exitCode = 1; throw error; });
}
