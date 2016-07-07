'use strict'; /* globals __dirname, __filename, process, module */ // license: MPL-2.0

const {
	concurrent: { async, },
	fs: { FS, },
} = require('es6lib');
const _ = String.raw;

	const nameprep = string => new URL('http://'+ string).hostname;
	const clone = (_node => {
		if (_node === 1) { return 1; }
		const node = { $: _node.$, };
		_node._ && (node._ = _node._.map(nameprep));
		Object.keys(_node).forEach(key => key !== '$' && key !== '_' && (node[nameprep(key)] = clone(_node[key])));
		return node;
	});

const umd = (name, depts, module) => `(function (root, factory) {
	if (typeof define === 'function'/* && define.amd*/) {
		define('${ name }', [ ${ depts.map(s => '"'+ s +'"').join(', ') } ], factory);
	} else if (typeof exports === 'object' && typeof module === 'object') {
		module.exports = factory(exports${ depts.map(s => ', require("'+ s +'")') });
	} else {
		factory((root['${ name }'] = { })${ depts.map(s => ', root["'+ s +'"]') });
	}
}(this, ${ module }));`;

const object = (tree, name) => umd(name, [ ], _`function() { 'use strict'; // generated code // license: MPL-2.0
	const _tree = (`+
		JSON.stringify(tree)
		.replace(/({|,)"([\$a-z\_]\w*)":/g, '$1$2:') // remove quotes around simple keys
		.replace(/\{\$\:1\}/g, 1) // replace leaf-objects with 1
	+_`);
	const nameprep = (${ nameprep }); // returns browser dependant results
	const clone = (${ clone });
	const tree = clone(_tree); // needs to be done in the browser so that nameprep matches the internal implementation

	/**
	 * Returns the TLD part of a domain:
	 * <input>         ==>   <output>       (<matching rule>)
	 * 'a.b.com'       ==>   '.com'         ('com')
	 * 'b.com.au'      ==>   '.com.au'      ('com.au')
	 * 'com.au'        ==>   '.au'          ('au')
	 * 'a.b.de'        ==>   '.de'          ('de')
	 * 'a.b.com.de'    ==>   '.com.de'      ('com.de')
	 * 'com.de'        ==>   '.de'          ('de')
	 * 'a.foo.ck'      ==>   '.foo.ck'      ('*.ck')
	 * 'com.ck'        ==>   null           ('*.ck', but no 'ck')
	 * 'a.www.ck'      ==>   '.ck'          ('*.ck', but '!www.ck')
	 * 'a.xn--unup4y'  ==>   '.xn--unup4y'  ('游戏')
	 * 'a.github.io'   ==>   '.github.io'   ('github.io')
	 * 'localhost'     ==>   ''
	 * 'foo'           ==>   ''
	 * @param  {string}  domain  Full domain (or a TLD including leading '.') from which to obtain the TLD
	 * @return {string}          TLD including leading '.', null if no rule could be matched, '' if domain contains no '.'
	 */
	const getTLD = (`+ function getTLD(domain) {
		if (domain == null) { return null; }
		const parts = (domain +'').split('.');
		if (parts.length === 1) { return ''; }
		let node = tree, tld = '';
		while (1) {
			const part = parts.pop();
			if (node === 1) { break; }
			if (!parts.length && node.$) { break; } // leave the last part (e.g: 'com.de' is a valid domain under the TLD '.de', but also a TLD itself)
			if (node[part]) { tld = '.'+ part + tld; node = node[part]; continue; }
			if (node._) { !node._.includes(part) && (tld = '.'+ part + tld); break; }
			if (node.$) { break; }
			return null;
		}
		if (tld.length > domain.length) { return null; } // leave the last part
		return tld;
	} +_`);
	getTLD.tree = _tree;
	return getTLD;
}`);

const build = module.exports = async(function*(moduleName = 'background/tld', fileName = moduleName +'/index.js') {
	const list = (yield require('request-promise')('https://publicsuffix.org/list/public_suffix_list.dat')); // info: https://publicsuffix.org/list/
	const tlds = list.split(/\r?\n|\r/gm).filter(s => s && !(/^\/\//).test(s)).map(s => s.match(/^(.*?)(?:\s|$)/)[1])/*.slice(0, 100)*/;
	const tree = { };
	tlds.forEach(tld => {
		const parts = tld.split('.');
		add(parts, tree);
	});
	function add(parts, node) {
		if (!parts.length) { node.$ = 1; return; }
		const key = parts.pop();
		if (key === '*') { node._ || (node._ = [ ]); return; } // "Wildcards are not restricted to appear only in the leftmost position", but currently they do
		if ((/^!/).test(key)) { (node._ || (node._ = [ ])).push(key.slice(1)); return; }
		add(parts, node[key] || (node[key] = { }));
	}
	// console.log('tld tree', tree);
	const file = object(tree, moduleName);
	(yield FS.writeFile(fileName, file, 'utf8'));
	return { data: file, path: fileName, tlds, };
});

if (process.argv[1] === __filename) {
	build()
	.then(() => console.log('background/tld/index.js created'))
	.catch(error => { console.error(error); process.exit(-1); });
}
