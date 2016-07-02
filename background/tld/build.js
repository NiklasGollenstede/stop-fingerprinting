'use strict'; /* globals __dirname, __filename, process, module */ // license: MPL-2.0

const {
	concurrent: { async, promisify, spawn, },
	fs: { FS, Path: { resolve, }, },
	functional: { log, },
} = require('es6lib');
const _ = String.raw;

// uses a regular expression to find the TLD suffix
const forward = (tree, name) => {
	function stringify(node) {
		const strings = [ ];
		if (node.$glob) {
			if (node.$glob.length) {
				strings.push(_`(?:\.(?!`+ node.$glob.join(_`|`) +_`)[^.]+|)`);
			} else {
				strings.push(_`[^.]+`);
			}
		} else {
			const keys = Object.keys(node);
			if (keys.length > 1 || !node.$end) {
				strings.push(_`(?:`+ keys.filter(key => key !== '$end').map(key => stringify(node[key]) +_`\.`+ key).join(_`|`) +(node.$end ? _`|` : _``) +_`)`);
			}
		}
		return strings.join('');
	}
	const regExp = _`(`+ stringify(tree) +_`)$`;
	// console.log('regExp', regExp);
	return (_`// generated file
define('${ name }', function() { 'use strict'; // license: MPL-2.0
	const regExp = (/${ regExp }/);
	return `+ function getTld(domain) {
		const match = regExp.exec(domain);
		return match && match[1];
	} +`;
});
`	);
};

// reverts the input, uses a regular expression to find the reverted prefix and reverts the result. Is ~ 10 times faster than the forward approach
const reverse = (tree, name) => {
	function reverse(string) { return Array.from(string).reverse().join(''); }
	function stringify(node) {
		const strings = [ ];
		if (node.$glob) {
			if (node.$glob.length) {
				strings.push(_`(?:(?!`+ node.$glob.map(reverse).join(_`|`) +_`)[^.]+\.|)`);
			} else {
				strings.push(_`[^.]+`);
			}
		} else {
			const keys = Object.keys(node);
			if (keys.length > 1 || !node.$end) {
				strings.push(_`(?:`+ keys.filter(key => key !== '$end').map(key => reverse(key) +_`\.`+ stringify(node[key])).join(_`|`) +(node.$end ? _`|` : _``) +_`)`);
			}
		}
		return strings.join('');
	}
	const regExp = _`^(`+ stringify(tree) +_`)`;
	// console.log('regExp', regExp);
	return (_`// generated file
define('${ name }', function() { 'use strict'; // license: MPL-2.0
	const regExp = (/${ regExp }/);
	const reverse = (${ reverse });
	return `+ function getTld(domain) {
		domain = reverse(domain);
		const match = regExp.exec(domain);
		return match && reverse(match[1]);
	} +`;
});
`	);
};

// directly traverses the tree object. Is ~ 100 times faster than the forward RegExp approach
const object = (tree, name) => (_`// generated file
define('${ name }', function() { 'use strict'; // license: MPL-2.0
	const tree = (${ JSON.stringify(tree).replace(/({|,)"([\$a-z]\w*)":/g, '$1$2:') });
	return `+ function getTld(domain) {
		const parts = domain.split('.');
		let node = tree, tld = '';
		while (1) {
			const part = parts.pop();
			if (
				node[part]
				|| node.$glob && !node.$glob.includes(part)
			) { tld = '.'+ part + tld; node = node[part]; continue; }
			if (node.$end) { break; }
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
		if (!parts.length) { node.$end = true; return; }
		const key = parts.pop();
		if (key === '*') { node.$glob || (node.$glob = [ ]); return; }
		if ((/^!/).test(key)) { (node.$glob || (node.$glob = [ ])).push(key.slice(1)); return; }
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
