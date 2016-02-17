'use strict';

try {
	const getExcludes = require('./exclude.js')._parse;

	const _ = String.raw;

	const tests = [
		{
			in:  _`abc`,
			out: _`^https?://abc.*$`,
		}, {
			in:  _`.abc`,
			out: _`^https?://\.abc.*$`,
		}, {
			in:  _`*.abc.def`,
			out: _`^https?://.*\.abc\.def.*$`,
		}, {
			in:  _`https?://.*\.abc\.def/`,
			out: _`^https?://https\?://\..*\\\.abc\\\.def/?$`,
		}, {
			in:  _`/https?://.*\.abc\.def/`,
			out: _`^https?://.*\.abc\.def/$`,
		}, {
			in:  _`/https?://.*\.abc\.def.*`,
			out: _`^https?://.*\.abc\.def.*$`,
		}, {
			in:  _`/https?://.*\.abc\.def.*$`,
			out: _`^https?://.*\.abc\.def.*$`,
		}, {
			in:  _`/https?:\/\/.*\.abc\.def.*$`,
			out: _`^https?:\/\/.*\.abc\.def.*$`,
		}, {
			in:  _`http://xyz.ce`,
			out: _`^http://xyz\.ce.*$`,
		}, {
			in:  _`https://*`,
			out: _`^https://.*.*$`,
		}, {
			in:  _`/https\:\/\/(www\.)?blob\.(com|org|net).*`,
			out: _`^https\:\/\/(www\.)?blob\.(com|org|net).*$`,
		}, {
			in:  _`/\h\t\t\p\s:\/\/(www\.)?blob\.(com|org|net).*`,
			out: _`^\h\t\t\p\s:\/\/(www\.)?blob\.(com|org|net).*$`,
		}, {
			in:  _`asd.*.asd`,
			out: _`^https?://asd\..*\.asd.*$`,
		}, {
			in:  _`blob.com?v=*`,
			out: _`^https?://blob\.com\?v=.*.*$`,
		}, {
			in:  _`https://www.domain.com/path`,
			out: _`^https://www\.domain\.com/path.*$`,
		}, {
			in:  _`https://www.domain.com/path/`,
			out: _`^https://www\.domain\.com/path/?$`,
		}, {
			in:  _`.*\ `,
			out: _`^https?://\..*\\.*$`,
		}, {
			in:  _`.*$\\`,
			out: _`^https?://\..*\$\\\\.*$`,
		}, {
			in:  _`.*$\/`,
			out: _`^https?://\..*\$\\/?$`,
		}, {
			in:  _`.*$\\/`,
			out: _`^https?://\..*\$\\\\/?$`,
		}, {
			in:  _`/.*\ `,
			out: _`^https?://.*$`,
		}, {
			in:  _`/.*$\\`,
			out: _`^https?://.*$`,
		}, {
			in:  _`/.*$\/`,
			out: _`^https?://.*$\/$`,
		}, {
			in:  _`/.*$\\/`,
			out: _`^https?://.*$\\/$`,
		}, {
			in:  _`/.*\$\\`,
			out: _`^https?://.*$`,
		},
	];

	let failed = 0;

	tests.forEach(test => {
		const expected = '(?:'+ test.out +')';
		const result = getExcludes(test.in.trim());
		if (result !== expected) {
			++failed;
			console.error('expected result of\n\t'+ test.in +'\nwhich is\n\t'+ result +'\nto equal\n\t'+ expected +'\n');
		}
	});

	if (failed) {
		throw new Error(failed +' tests ('+ Math.round(failed / tests.length * 100) +'%) failed');
	}

} catch (error) {
	console.error(error);
	process.exit(-1);
}

console.log('All tests passed');
