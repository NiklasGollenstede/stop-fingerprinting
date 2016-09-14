'use strict'; /* globals __dirname, __filename, process, Buffer */

const {
	concurrent: { async, spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
} = require('es6lib');
const { join, relative, resolve, dirname, basename, } = require('path');

const { SourceNode, } = require('source-map');


const injectFrame = {
	prefix: `
(function () { try {
	const injectedSource = (function(options, injectedSource, applyingSource, workerOptions) {
'use strict';
//// start scripts
`,
	suffix: `
//// end scripts
	});
	const options = JSON.parse(this.dataset.arg1);
	const applyingSource = this.dataset.arg0;
	const value = injectedSource.call(window, options, injectedSource, applyingSource);
	this.dataset.done = true;
	this.dataset.value = JSON.stringify(value) || 'null';
} catch (error) {
	console.error(error);
	this.dataset.error = JSON.stringify(error, (key, value) => {
		if (!value || typeof value !== 'object') { return value; }
		if (value instanceof Error) { return '$_ERROR_$'+ JSON.stringify({ name: value.name, message: value.message, stack: value.stack, }); }
		return value;
	});
} }).call(document.currentScript)
`,
};

const applyFrame = {
	prefix: globalNames => `
'use strict';
const currentGlobal = self; {
	const { ${ globalNames.join(', ') }, } = context.globals; {
		const { hideCode, hideAllCode, } = context;
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



const build = async(function*() {

	const globalsJs = (yield FS.readFile('./src/globals.js', 'utf8'));
	const globalNames = globalsJs.split(/\r\n?|\n/g).map(line => ((/^const ([\w$]+)\s+\=/).exec(line) || [ ])[1]).filter(_=>_);
	globalNames.push('options', 'injectedSource', 'applyingSource', 'workerOptions');


	const injected = new SourceNode(null, null, null); {
		addFile(injected, './src/globals.js', globalsJs);
		injected.add(`\n\nconst globals = ({ ${ globalNames.join(', ') }, });\n`);
		addFile(injected, './src/context.js', (yield FS.readFile('./src/context.js', 'utf8')));
		addFile(injected, './src/apply.js', (yield FS.readFile('./src/apply.js', 'utf8')));

		injected.prepend(injectFrame.prefix);
		injected.    add(injectFrame.suffix);
	}

	const applying = new SourceNode(null, null, null); {
		for (let name of (yield FS.readdir('./src/fake/'))) {
			applying.add(`{ // /content/src/fake/${ name }\n`);
			addFile(applying, './src/fake/'+ name, (yield FS.readFile('./src/fake/'+ name, 'utf8')));
			applying.add(`}\n`);
		}

		applying.prepend(applyFrame.prefix(globalNames));
		applying.    add(applyFrame.suffix);
	}


	const injector = new SourceNode(null, null, null);

	injector.add(`'use strict';\n`);
	{
		const { code, map, } = injected.toStringWithSourceMap({ sourceRoot: '<unset>', });
		injector.add('const injectedSource = String.raw`'+ code.replace('`', '\\`') +'`;\n');
		injector.add('const injectedSourceMap = '+ JSON.stringify(map) +';\n');
	}
	{
		const { code, map, } = applying.toStringWithSourceMap({ sourceRoot: '<unset>', });
		injector.add('const applyingSource = String.raw`'+ code.replace('`', '\\`') +'`;\n');
		injector.add('const applyingSourceMap = '+ JSON.stringify(map) +';\n');
	}
	addFile(injector, './src/injector.js', (yield FS.readFile('./src/injector.js', 'utf8')));

	const data = toInline(injector);

	(yield FS.writeFile('./index.js', data, 'utf8'));

});


if (process.argv[1] === __filename) {
	build()
	.then(() => console.log('/content/index.js created'))
	.catch(error => { console.error(error); process.exit(-1); });
}

function addFile(node, name, data, lOff = 0, cOff = 0) {
	lOff += 1;
	data.split(/\r\n?|\n/g).forEach((line, ll) => {
		line.split(/\b/).reduce((cc, token) => {
			node.add(new SourceNode(ll + lOff, cc + cOff, name, token));
			return cc + token.length;
		}, 0);
		node.add('\n');
	});
}

function toInline(node, options) {
	const { code, map, } = node.toStringWithSourceMap(options);
	return code +`\n\n//# sourceMappingURL=data:application/json;base64,`+ new Buffer(JSON.stringify(map)).toString('base64') +'\n';
}
