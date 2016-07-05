'use strict'; /* globals __dirname, __filename, process, module */ // license: MPL-2.0

const {
	concurrent: { async, promisify, spawn, },
	fs: { FS, Path: { resolve, }, },
	functional: { log, },
} = require('es6lib');
const _ = String.raw;
const nameprep = string => new URL('http://'+ string).host;
const clone = (_node => {
	if (_node === 1) { return 1; }
	const node = { $: _node.$, };
	_node._ && (node._ = _node._.map(nameprep));
	Object.keys(_node).forEach(key => key !== '$' && key !== '_' && (node[nameprep(key)] = clone(_node[key])));
	return node;
});

const object = (tree, name) => (_`// generated file
define('${ name }', function() { 'use strict'; // license: MPL-2.0
	const _tree = (`+
		JSON.stringify(tree)
		.replace(/({|,)"([\$a-z\_]\w*)":/g, '$1$2:') // remove quotes around simple keys
		.replace(/\{\$\:1\}/g, 1) // replace leaf-objects with 1
	+_`);
	const nameprep = (${ nameprep });
	const clone = (${ clone });
	const tree = clone(_tree);
	window.tldTree = tree; // TODO: remove
	return `+ function getTld(domain) {
		const parts = domain.split('.');
		let node = tree, tld = '';
		while (1) {
			const part = parts.pop();
			if (node === 1) { break; }
			if (!parts.length && node.$) { break; } // leave the last part (e.g: 'com.de' is a valid domain under the TLD '.de', but also a TLD itself)
			if (
				node[part]
				|| node._ && !node._.includes(part)
			) { tld = '.'+ part + tld; node = node[part]; continue; }
			if (node.$) { break; }
			return null;
		}
		return tld;
	} +`;
});
`);

const build = module.exports = async(function*(moduleName = 'background/tld', fileName = moduleName +'/index.js') {
	const list = (yield require('request-promise')('https://publicsuffix.org/list/public_suffix_list.dat'));
	const tlds = list.split(/\r?\n|\r/gm).filter(s => s && !(/^\/\//).test(s)).map(s => s.match(/^(.*?)(?:\s|$)/)[1])/*.slice(0, 100)*/;
	const tree = { };
	tlds.forEach(tld => {
		const parts = tld.split('.');
		add(parts, tree);
	});
	function add(parts, node) {
		if (!parts.length) { node.$ = 1; return; }
		const key = parts.pop();
		if (key === '*') { node._ || (node._ = [ ]); return; }
		if ((/^!/).test(key)) { (node._ || (node._ = [ ])).push(key.slice(1)); return; }
		add(parts, node[key] || (node[key] = { }));
	}
	// console.log('tld tree', tree);
	const file = object(tree, moduleName);
	(yield FS.writeFile(fileName, file, 'utf8'));
	return file;
});

if (process.argv[1] === __filename) {
	build()
	.then(() => console.log('background/tld/index.js created'))
	.catch(error => { console.error(error); process.exit(-1); });
}

/*
const { Timer, } = require('es6lib/functional');
const tldFw  = require('background/tld-fw');
const tldRv  = require('background/tld-rv');
const tldObj = require('background/tld-obj');
function checkSpeed(domain) {
	const tFw = new Timer;
	const rFw = tldFw(domain);
	const eFw = tFw();
	const tRv = new Timer;
	const rRv = tldRv(domain);
	const eRv = tRv();
	const tObj = new Timer;
	const rObj = tldObj(domain);
	const eObj = tObj();
	console.log('TDL times', eFw, eRv, eObj);
	if (rFw !== rRv || rRv !== rObj) { console.error('TLD mismatch', rFw, rRv, rObj); }
}
*/
