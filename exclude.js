'use strict';

function log() { console.log.apply(console, arguments); return arguments[arguments.length - 1]; }

const nothing = '^(?!x)x$';

module.exports = function getExcludes(input) {

	const fromString = string => '^' + string
	.replace(/[\\\.\(\)\{\}\[\]\?\|\^\$]/g, c => '\\'+ c) // escape for RegExp
	.replace(/^((https?|file):\/\/)?/i, ($0, $1) => $1 || 'https?://') // enforce https?:// || http:// || https://
	.replace('*', '.*') // convert wildcard
	.replace(/(\/)?$/, ($0, $1) => $1 ? '\/?$' : '.*$'); // end at slach or fill with .*

	const fromRegExp = string => '^' + string
	.replace(/^\//g, '') // remove starting slash
	.replace(/^\^/, '') // match from start
	.replace(/^((\\?h\\?t\\?t\\?p(\\?s\??)?\\?|\\?f\\?i\\?l\\?e)\\?:\\?\/\\?\/)?/i, ($0, $1) => $1 || 'https?://') // enforce https?:// || http:// || https:// || file:// (where each character may be escaped)
	.replace(/\\*\$?\\*$/, '$'); // match to end, making shure the '$' is not escaped

	const lines = (input || '')
	.split(/\s*[\n\r]+\s*/)
	.filter(line => line && !(/^[#;]/).test(line))
	.map(line => (/^\//).test(line) ? fromRegExp(line) : fromString(line))
	.filter(x => x);

	const excludes = lines.length ? '(?:'+ lines.join(')|(?:') +')' : nothing;

	return excludes;
};
