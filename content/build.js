'use strict'; /* globals __dirname, __filename, process, Buffer, module */

const {
	concurrent: { async, spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
	string: { escapeForTemplateString, },
} = require('es6lib');
const RegExpX = require('regexpx');
const { join, relative, resolve, dirname, basename, sep, } = require('path');

// const { SourceNode, } = require('source-map');

const getGlobals = RegExpX`
	^ \s* \/\* \s* globals \s+ # the decalration of checked globals
		( (?: [\w$]+ ,\s* )* ) # comma terminated list of words
	\* \/ \s*
	(?: (?: # optionally more comments
		  \/\* [^]*? \*\/ # block comment
		| \/\/ .*         # line comment
	) \s* )*
`;

const _ = (s, ...a) => resolve(__dirname, String.raw({ raw: s, }, ...a));

const build = module.exports = async(function*() {

	const globalsJs = (yield FS.readFile(_`./src/globals.js`, 'utf8'));
	const globalNames = globalsJs.split(/\r\n?|\n/g).map(line => ((/^\s*const ([\w$]+)\s+\=/).exec(line) || [ ])[1]).filter(_=>_);
	const unused = new Set(globalNames);

	function checkDeps(path) {
		return FS.readFile(path, 'utf8').then(file => {
			const match = getGlobals.exec(file);
			if (!match) { throw new Error(`"${ path }" does not specify its global dependencies`); }
			const deps = match[1].replace(/,\s*$/, '').split(/,\s*/g);
			const missing = deps.filter(dep => ((unused.delete(dep)), !globalNames.includes(dep)));
			if (missing.length) { throw new Error(`"${ path }" requires a missing globals: ${ missing.join(', ') }`); }
			return {
				content: `'use strict'; file: {`
					+ match[0].replace(/.*/gm, '') // strip leading comments
					+ file.slice(match[0].length)
				+'}',
				offset: 0, // if the offset is > 0, firefox produces correct stack traces but messes up the line numbers in the debugger
				name: relative(__dirname, path).split(sep).join('/'),
			};
		});
	}

	const files = { fake: { }, };

	files['globals.js'] = { content: globalsJs, offset: 0, name: 'src/globals.js', };
	for (let name of (yield FS.readdir(_`./src/fake/`))) {
		files.fake[name] = (yield checkDeps(_`./src/fake/${ name }`));
	}
	files['apply.js'] = (yield checkDeps(_`./src/apply.js`));

	if (unused.size) {
		console.warn(`Unused global variables: `+ Array.from(unused).join(', '));
	}

	const data = `this.files = (`+ JSON.stringify(files, null, '\t') +`);`;

	(yield FS.writeFile(_`./files.js`, data, 'utf8'));

});


if (process.argv[1] === __filename) {
	build()
	.then(() => console.log('/content/index.js created'))
	.catch(error => { console.error(error); process.exit(-1); });
}
