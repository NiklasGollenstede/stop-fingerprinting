(function() { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/functional': { cached, },
	'node_modules/get-tld/': { Host, },
	'node_modules/regexpx/': RegExpX,
	'common/utils': { nameprep, },
}) {

const patternTypes = RegExpX`^(?: # anchor
	(file:\/\/.*)	# file:// url prefix
|				# OR
	(?:			# a "normal" url
		(			# scheme
			https?: | ftp: | \*:
		)				# is http, https, ftp or <any>
	\/\/)?				# is optional (default to https)
	(				# host
		(?:\*\.)?		# may start with '*.'
		[\w-]+			# must contain at least one word
		(?: \.[\w-]+ )*	# may contain more '.'+ word
		(?: :\d+ )?		# may have a port number
	)					# is not optional
	\/?
)$`;

const cache = new Map;

class OriginPattern {
	constructor(string, regExp) {
		this.string = string;
		this.regExp = regExp;
	}

	includes(url/*: URL */) { /*: bool */
		if (typeof url === 'string') { url = new URL(url); }
		return url.origin === 'null'
		? this.regExp.test(url.href)
		: this.regExp.test(url.origin);
	}

	toString() {
		return this.string;
	}
}

const originFromPlainString = cached(string => new OriginPattern(
	string,
	RegExpX`^ ${ string } $`
), cache);

const originFromUrl = url/*: URL */ => url.origin === 'null'
? originFromPlainString(url.href)
: originFromPlainString(url.origin);

const originFromPattern = cached(function(pattern) {
	pattern = nameprep(pattern);
	const match = patternTypes.exec(pattern);
	if (!match) { throw new Error(`Pattern "${ pattern }" is invalid`); }
	let [ , filePrefix, protocol, host, ] = match;
	protocol || (protocol = 'https:');

	if (filePrefix) {
		return new OriginPattern(
			filePrefix,
			RegExpX`^ ${ filePrefix }`
		);
	}

	const anySub = host.includes('*');
	if (anySub) {
		if (host.lastIndexOf('*') !== host.indexOf('*')) { throw new Error(`Pattern "${ pattern }" contains more than one '*' in the host part`); }
		if (new Host(host).sub !== '*.') { throw new Error(`Pattern "${ pattern }" contains a '*' in a bad position`); }
	}

	if (!anySub && protocol !== '*') { return originFromPlainString((protocol +'//'+ host)); } // to get the correctly cached version

	const protocolExp = protocol === '*:' ? (/\w+\:/) : protocol;

	const regExp = RegExpX`^
		${ protocol === '*:' ? (/\w+\:/) : protocol }
		//
		${ anySub ?      (/.*\./) : '' }
		${ anySub ? host.slice(2) : host }
	$`;

	return new OriginPattern(pattern, regExp);
}, cache);

const originFromPatternGroup = cached(function(patterns) {
	const split = patterns.split(/\s*\|\s*/);
	if (split.length === 1) { return originFromPattern(patterns); }
	const children = split.map(originFromPattern);
	const origin = new OriginPattern(patterns, RegExpX`${ children.map(_=>_.regExp) }`);
	origin.children = children;
	return origin;
}, cache);

return { originFromPatternGroup, originFromUrl, };

}); })();
