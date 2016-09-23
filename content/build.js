'use strict'; /* globals __dirname, __filename, process, Buffer, module */

const {
	concurrent: { async, spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
	string: { escapeForTemplateString, },
} = require('es6lib');
const { join, relative, resolve, dirname, basename, } = require('path');

const { SourceNode, } = require('source-map');

const applyFrame = {
	prefix: globalNames => `
'use strict';
const currentGlobal = self; {
	const { ${ globalNames.join(', ') }, } = context.globals; {
		const { hideCode, hideAllCode, globals, } = context;
		const apis = { };

		function define(name, object) {
			const current = apis[name] || { };
			if (typeof object === 'function') { object = object(current); }
			return (apis[name] = assign(current, object));
		}
//// start scripts
`,
suffix: `
//// end scripts
		return apis;
	}
}
`,
};

const _ = (s, ...a) => resolve(__dirname, String.raw({ raw: s, }, ...a));

const build = module.exports = async(function*() {

	const globalsJs = (yield FS.readFile(_`./src/globals.js`, 'utf8'));
	const globalNames = globalsJs.split(/\r\n?|\n/g).map(line => ((/^\s*const ([\w$]+)\s+\=/).exec(line) || [ ])[1]).filter(_=>_);
	// globalNames.push('options', 'injectedSource', 'applyingSource', 'workerOptions');
	const unused = new Set(globalNames);

	function checkDeps(path) {
		return FS.readFile(path, 'utf8').then(file => {
			const match = (/\/\*\s*globals\s+([\w+$]+(?:,\s*[\w$]+)*)/).exec(file);
			if (!match) { throw new Error(`"${ path }" does not specify its global dependencies`); }
			const deps = match[1].split(/,\s*/g);
			const missing = deps.filter(dep => ((unused.delete(dep)), !globalNames.includes(dep)));
			if (missing.length) { throw new Error(`"${ path }" requires a missing globals: ${ missing.join(', ') }`); }
			return file;
		});
	}

	const injected = new SourceNode(null, null, null); {
		addFile(injected, `src/globals.js`, globalsJs, { scoped: false, });
		injected.add(`\n\nconst globals = ({ ${ globalNames.join(', ') }, });\n`);
		addFile(injected, `src/context.js`, (yield checkDeps(_`./src/context.js`)), { lOff: 0, scoped: false, });
		addFile(injected, `src/apply.js`, (yield checkDeps(_`./src/apply.js`)), { lOff: -1, });
	}

	const applying = new SourceNode(null, null, null); {
		for (let name of (yield FS.readdir(_`./src/fake/`))) {
			// applying.add(`file: { // /content/src/fake/${ name }\n`);
			addFile(applying, `src/fake/${ name }`, (yield checkDeps(_`./src/fake/${ name }`)), { lOff: -2, }); // TODO: find correct offset ...
			// applying.add(`} `);
		}

		applying.prepend(applyFrame.prefix(globalNames));
		applying.    add(applyFrame.suffix);
	}

	if (unused.size) {
		console.error(`Unused global variables :`+ Array.from(unused).join(', '));
	}

	const injector = new SourceNode(null, null, null);

	injector.add(`'use strict';\n`);
	{
		const { code, map, } = injected.toStringWithSourceMap({ sourceRoot: '<unset>', });
		injector.add('const injectedSource = (`'+ escapeForTemplateString(code) +'`);\n');
		injector.add('const injectedSourceMap = '+ JSON.stringify(map) +';\n');
	}
	{
		const { code, map, } = applying.toStringWithSourceMap({ sourceRoot: '<unset>', });
		injector.add('const applyingSource = (`'+ escapeForTemplateString(code) +'`);\n');
		injector.add('const applyingSourceMap = '+ JSON.stringify(map) +';\n');
	}
	addFile(injector, 'src/injector.js', (yield FS.readFile(_`./src/injector.js`, 'utf8')));

	const data = toInline(injector);

	(yield FS.writeFile(_`./index.js`, data, 'utf8'));

});


if (process.argv[1] === __filename) {
	build()
	.then(() => console.log('/content/index.js created'))
	.catch(error => { console.error(error); process.exit(-1); });
}

function addFile(node, name, data, { lOff = 0, cOff = 0, scoped = true, } = { }) {
	lOff += 1;
	scoped && node.add(`file: { `);
	node.add(`// begin file /content/${ name }\n`);
	data.split(/\r\n?|\n/g).forEach((line, ll) => {
		line.split(/\b/).reduce((cc, token) => {
			node.add(new SourceNode(Math.max(1, ll + lOff), cc + cOff, name, token));
			return cc + token.length;
		}, 0);
		node.add('\n');
	});
	scoped && node.add(`} `);
	node.add(`// end file /content/${ name }\n`);
}

function toInline(node, options) {
	const { code, map, } = node.toStringWithSourceMap(options);
	return code +`\n\n//# sourceMappingURL=data:application/json;base64,`+ new Buffer(JSON.stringify(map)).toString('base64') +'\n';
}
