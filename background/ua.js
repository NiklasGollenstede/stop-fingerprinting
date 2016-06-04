(function(exports) { 'use strict';

const browser_os = [
	{ parts: 100, browser: 'chrome',  os: 'win', },
	// { parts:  10, browser: 'chrome',  os: 'mac', }, // TODO
	// { parts:  10, browser: 'chrome',  os: 'lin', }, // TODO
	{ parts: 100, browser: 'ie',	  os: 'win', },
	{ parts:  25, browser: 'firefox', os: 'win', },
	// { parts:   5, browser: 'firefox', os: 'mac', }, // TODO
	// { parts:   7, browser: 'firefox', os: 'lin', }, // TODO
	// { parts:   8, browser: 'opera',   os: 'win', }, // TODO
	// { parts:   1, browser: 'opera',   os: 'mac', }, // TODO
	// { parts:   1, browser: 'opera',   os: 'lin', }, // TODO
	// { parts:  20, browser: 'safari',  os: 'mac', }, // TODO
];

const os_arch = [
	{ parts: 100, arch: '32_32', },
	{ parts: 100, arch: '32_64', },
	{ parts: 100, arch: '64_64', },
];

const os_version = {
	win: [
		{ date: +new Date('2015-07'), version: '10.0', }, // win 10 (XXX: also 6.4?)
		{ date: +new Date('2013-09'), version: '6.3', }, // win 8.1
		{ date: +new Date('2012-09'), version: '6.2', }, // win 8
		{ date: +new Date('2009-09'), version: '6.1', }, // win 7
		{ date: +new Date('2007-06'), version: '6.1', }, // win vista
		{ date: +new Date('2001-09'), version: '5.1', }, // win XP
	],
	mac: [
		{ date: +new Date('1970-01'), version: 'all', }, // TODO
	],
	lin: [
		{ date: +new Date('1970-01'), version: 'all', },
	],
};

const browser_version = {
	firefox: [
		{ date: +new Date('2017-01-24'), version: '51.0', },
		{ date: +new Date('2016-11-08'), version: '50.0', },
		{ date: +new Date('2016-09-13'), version: '49.0', },
		{ date: +new Date('2016-08-02'), version: '48.0', },
		{ date: +new Date('2016-06-07'), version: '47.0', },
		{ date: +new Date('2016-04-26'), version: '46.0', },
		{ date: +new Date('2016-03-08'), version: '45.0', },
		{ date: +new Date('2016-01-26'), version: '44.0', },
		{ date: +new Date('2015-12-15'), version: '43.0', },
		{ date: +new Date('2015-11-03'), version: '42.0', },
		{ date: +new Date('2015-09-22'), version: '41.0', },
		{ date: +new Date('2015-08-11'), version: '40.0', },
		{ date: +new Date('2015-06-30'), version: '39.0', },
		{ date: +new Date('2015-05-12'), version: '38.0', },
		{ date: +new Date('2015-03-31'), version: '37.0', },
		{ date: +new Date('2015-02-24'), version: '36.0', },
		{ date: +new Date('2015-01-13'), version: '35.0', },
		{ date: +new Date('2014-12-01'), version: '34.0', },
		{ date: +new Date('2014-10-14'), version: '33.0', },
		{ date: +new Date('2014-09-02'), version: '32.0', },
		{ date: +new Date('2014-07-22'), version: '31.0', },
		{ date: +new Date('2014-06-10'), version: '30.0', },
		{ date: +new Date('2014-04-29'), version: '29.0', },
		{ date: +new Date('2014-03-18'), version: '28.0', },
		{ date: +new Date('2014-02-04'), version: '27.0', },
		{ date: +new Date('2013-12-10'), version: '26.0', },
		{ date: +new Date('2013-10-29'), version: '25.0', },
		{ date: +new Date('2013-09-17'), version: '24.0', },
		{ date: +new Date('2013-08-06'), version: '23.0', },
		{ date: +new Date('2013-06-25'), version: '22.0', },
		{ date: +new Date('2013-05-14'), version: '21.0', },
		{ date: +new Date('2013-04-02'), version: '20.0', },
		{ date: +new Date('2013-02-19'), version: '19.0', },
		{ date: +new Date('2013-01-08'), version: '18.0', },
		{ date: +new Date('2012-11-20'), version: '17.0', },
		{ date: +new Date('2012-10-09'), version: '16.0', },
		{ date: +new Date('2012-08-28'), version: '15.0', },
		{ date: +new Date('2012-07-17'), version: '14.0', },
		{ date: +new Date('2012-06-05'), version: '13.0', },
		{ date: +new Date('2012-04-24'), version: '12.0', },
		{ date: +new Date('2012-03-13'), version: '11.0', },
		{ date: +new Date('2012-01-31'), version: '10.0', },
	],
	chrome: [
		{ date: +new Date('2016-11-17') + 53 * 86400000, version: '56.0', },
		{ date: +new Date('2016-10-06') + 53 * 86400000, version: '55.0', },
		{ date: +new Date('2016-08-25') + 53 * 86400000, version: '54.0', },
		{ date: +new Date('2016-06-30') + 53 * 86400000, version: '53.0', },
		{ date: +new Date('2016-05-19') + 53 * 86400000, version: '52.0', },
		{ date: +new Date('2016-04-08') + 53 * 86400000, version: '51.0', },
		{ date: +new Date('2016-02-26') + 53 * 86400000, version: '50.0', },
		{ date: +new Date('2016-01-15') + 53 * 86400000, version: '49.0', },
		{ date: +new Date('2015-11-13') + 53 * 86400000, version: '48.0', },
		{ date: +new Date('2015-10-02') + 53 * 86400000, version: '47.0', },
		{ date: +new Date('2015-08-21') + 53 * 86400000, version: '46.0', },
		{ date: +new Date('2015-07-10') + 53 * 86400000, version: '45.0', },
		{ date: +new Date('2015-04-03') + 53 * 86400000, version: '43.0', },
		{ date: +new Date('2015-05-15') + 53 * 86400000, version: '44.0', },
		{ date: +new Date('2015-02-20') + 53 * 86400000, version: '42.0', },
		{ date: +new Date('2015-01-09') + 53 * 86400000, version: '41.0', },
		{ date: +new Date('2014-11-07') + 53 * 86400000, version: '40.0', },
		{ date: +new Date('2014-09-26') + 53 * 86400000, version: '39.0', },
		{ date: +new Date('2014-08-15') + 53 * 86400000, version: '38.0', },
		{ date: +new Date('2014-06-20') + 53 * 86400000, version: '37.0', },
		{ date: +new Date('2014-05-09') + 53 * 86400000, version: '36.0', },
		{ date: +new Date('2014-03-31') + 53 * 86400000, version: '35.0', },
		{ date: +new Date('2014-02-17') + 53 * 86400000, version: '34.0', },
		{ date: +new Date('2013-12-16') + 53 * 86400000, version: '33.0', },
		{ date: +new Date('2013-11-04') + 53 * 86400000, version: '32.0', },
		{ date: +new Date('2013-09-23') + 53 * 86400000, version: '31.0', },
		{ date: +new Date('2013-08-12') + 53 * 86400000, version: '30.0', },
		{ date: +new Date('2013-06-24') + 53 * 86400000, version: '29.0', },
		{ date: +new Date('2013-05-06') + 53 * 86400000, version: '28.0', },
		{ date: +new Date('2013-03-25') + 53 * 86400000, version: '27.0', },
		{ date: +new Date('2013-02-11') + 53 * 86400000, version: '26.0', },
		{ date: +new Date('2012-12-17') + 53 * 86400000, version: '25.0', },
		{ date: +new Date('2012-10-29') + 53 * 86400000, version: '24.0', },
		{ date: +new Date('2012-09-17') + 53 * 86400000, version: '23.0', },
		{ date: +new Date('2012-08-06') + 53 * 86400000, version: '22.0', },
		{ date: +new Date('2012-06-18') + 53 * 86400000, version: '21.0', },
		{ date: +new Date('2012-05-07') + 53 * 86400000, version: '20.0', },
		{ date: +new Date('2012-03-26') + 53 * 86400000, version: '19.0', },
		{ date: +new Date('2012-01-30') + 53 * 86400000, version: '18.0', },
		{ date: +new Date('2011-12-05') + 53 * 86400000, version: '17.0', },
	],
	ie: [
		{ date: + new Date('2016-05-10'), version: '14.14342', },
		{ date: + new Date('2016-04-26'), version: '14.14332', },
		{ date: + new Date('2016-04-22'), version: '14.14328', },
		{ date: + new Date('2016-04-06'), version: '14.14316', },
		{ date: + new Date('2016-03-25'), version: '14.14295', },
		{ date: + new Date('2016-03-17'), version: '14.14291', },
		{ date: + new Date('2016-03-04'), version: '14.14279', },
		{ date: + new Date('2016-03-24'), version: '14.14271', },
		{ date: + new Date('2016-03-18'), version: '14.14267', },
		{ date: + new Date('2016-03-03'), version: '13.14257', },
		{ date: + new Date('2016-01-27'), version: '13.14251', },
		{ date: + new Date('2016-01-21'), version: '13.11102', },
		{ date: + new Date('2016-01-13'), version: '13.11099', },
		{ date: + new Date('2015-12-16'), version: '13.11082', },
		{ date: + new Date('2015-11-05'), version: '13.10586', },
		{ date: + new Date('2015-10-29'), version: '13.10576', },
		{ date: + new Date('2015-10-12'), version: '13.10565', },
		{ date: + new Date('2015-09-18'), version: '13.10547', },
		{ date: + new Date('2015-08-27'), version: '12.10532', },
		{ date: + new Date('2015-08-18'), version: '12.10525', },
		{ date: + new Date('2015-07-15'), version: '12.10240', },
		{ date: + new Date('2015-07-09'), version: '12.10166', },
		{ date: + new Date('2015-07-02'), version: '12.10162', },
		{ date: + new Date('2015-06-30'), version: '12.10159', },
		{ date: + new Date('2015-06-29'), version: '12.10158', },
		{ date: + new Date('2015-05-29'), version: '12.10130', },
		{ date: + new Date('2015-05-20'), version: '12.10122', },
		{ date: + new Date('2015-04-29'), version: '12.10074', },
		{ date: + new Date('2015-04-22'), version: '12.10061', },
		{ date: + new Date('2015-03-30'), version: '12.10049', },
		{ date: 0, version: '11.0', },
	], // TODO
	opera: [ ], // TODO
	safari: [ ], // TODO
};

const crome_build = {
	'32.0': { a: { from: 1700, to: 1749, }, b: { from: 0, to: 0, }, },
	'33.0': { a: { from: 1750, to: 1846, }, b: { from: 0, to: 0, }, },
	'34.0': { a: { from: 1847, to: 1915, }, b: { from: 0, to: 0, }, },
	'35.0': { a: { from: 1916, to: 1984, }, b: { from: 0, to: 0, }, },
	'36.0': { a: { from: 1985, to: 2061, }, b: { from: 0, to: 0, }, },
	'37.0': { a: { from: 2062, to: 2124, }, b: { from: 0, to: 0, }, },
	'38.0': { a: { from: 2125, to: 2170, }, b: { from: 0, to: 0, }, },
	'39.0': { a: { from: 2171, to: 2213, }, b: { from: 0, to: 0, }, },
	'40.0': { a: { from: 2214, to: 2271, }, b: { from: 0, to: 0, }, },
	'41.0': { a: { from: 2272, to: 2310, }, b: { from: 0, to: 0, }, },
	'42.0': { a: { from: 2311, to: 2356, }, b: { from: 0, to: 0, }, },
	'43.0': { a: { from: 2357, to: 2402, }, b: { from: 0, to: 0, }, },
	'44.0': { a: { from: 2403, to: 2453, }, b: { from: 0, to: 0, }, },
	'45.0': { a: { from: 2454, to: 2489, }, b: { from: 0, to: 0, }, },
	'46.0': { a: { from: 2490, to: 2530 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'47.0': { a: { from: 2530, to: 2570 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'48.0': { a: { from: 2570, to: 2610 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'49.0': { a: { from: 2610, to: 2650 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'50.0': { a: { from: 2650, to: 2690 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'51.0': { a: { from: 2690, to: 2730 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'52.0': { a: { from: 2730, to: 2770 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
};

const ie_feature = [
	{ parts: 1, feature: 'SV1', },
	{ parts: 1, feature: 'SLCC1', },
	{ parts: 2, feature: 'InfoPath.2', },
	{ parts: 1, feature: 'InfoPath.3', },
	{ parts: 1, feature: '.NET4.0C', },
	{ parts: 1, feature: '.NET4.0E', },
	{ parts: 3, feature: '.NET CLR 2.0.50727', },
	{ parts: 1, feature: '.NET CLR 3.0.4506.2152', },
	{ parts: 4, feature: '.NET CLR 3.0.30729', },
	{ parts: 1, feature: '.NET CLR 3.1.40767', },
	{ parts: 5, feature: '.NET CLR 3.5.30729', },
	{ parts: 1, feature: 'Media Center PC 6.0', },
];

const Generator = exports.Generator = class Generator {
	constructor(config = { }) {
		this.browser_os = browser_os.filter(({ browser, os, }) => (!config.browsers || config.browsers.includes(browser)) && (!config.oss || config.oss.includes(os)));
		this.os_arch = config.arch ? os_arch.filter(({ arch, }) => config.arch.includes(arch)) : os_arch;
		this.os_age = parseRange(config.osAge, { from: 0, to: 3, });
		this.browser_age = parseRange(config.browserAge, { from: -1, to: 12, });
		this.ie_feature_count = parseRange(config.ieFeatureCount, { from: 0, to: 3, });
		this.ie_feature = config.ie_feature_exclude ? ieFeatures.filter(f => !f.match(config.ieFeatureExclude)) : ie_feature;
		this.validate();
	}
	validate() {
		if (!this.browser_os.length) { throw new Error('No possible combinations of operating system and browser type'); }
		if (!this.os_arch.length) { throw new Error('No operating system architecture allowed'); }
		if (this.ie_feature_count.from && !this.ie_feature.length) { throw new Error('All Internet Explorer features are excluded'); }
	}
	navigator() {
		return new Navigator(this);
	}
	generate() {
		return this.navigator();
	}
};

Generator.keys = [ 'platform', 'userAgent', 'productSub', ];

class Navigator {
	constructor(config) {
		const { os, browser, } = chooseWeightedRandom(config.browser_os);
		this.os = os; this.browser = browser;
		this.arch = chooseWeightedRandom(config.os_arch).arch;
		const os_release = Date.now() - randInRange(config.os_age) * 31536000000/*1 year*/;
		this.os_version = os_version[this.os].find(({ date, }) => date < os_release).version;
		const browser_release = Date.now() - randInRange(config.browser_age) * 604800000/*1 week*/;
		this.browser_version = browser_version[this.browser].find(({ date, }) => date < browser_release).version;
		this.browser === 'ie' && (this.ie_feature = chooseSomeRandom(config.ie_feature, config.ie_feature_count).map(({ feature, }) => feature));
		this.random = rand();
		this.json = null;
	}
	get platform() {
		return setValue(this, 'platform', (() => { switch (this.os) {
			case 'win': switch (this.arch) {
				case '32_32': switch (this.browser) {
					case 'chrome':  return 'Win32';
					case 'firefox': return 'Win32';
					case 'ie':      return 'Win32';
					case 'opera':   return 'Win32';
				} break;
				case '32_64': switch (this.browser) {
					case 'chrome':  return 'Win32';
					case 'firefox': return 'WOW64';
					case 'ie':      return 'WOW64';
					case 'opera':   return 'WOW64';
				} break;
				case '64_64': switch (this.browser) {
					case 'chrome':  return 'Win32';
					case 'firefox': return 'Win64';
					case 'ie':      return 'Win64';
					case 'opera':   return 'Win64';
				} break;
			} break;
			case 'mac': {
				return 'MacIntel';
			} break;
			case 'win': switch (this.arch) {
				case '32_32': switch (this.browser) {
					case 'chrome':  return 'Linux i686';
					case 'firefox': return 'Linux i686';
					case 'opera':   return 'Linux i686';
				} break;
				case '32_64': switch (this.browser) {
					case 'chrome':  return 'Linux i686 on x86_64';
					case 'firefox': return 'Linux i686 on x86_64';
					case 'opera':   return 'Linux i686 on x86_64';
				} break;
				case '64_64': switch (this.browser) {
					case 'chrome':  return 'Linux x86_64';
					case 'firefox': return 'Linux x86_64';
					case 'opera':   return 'Linux x86_64';
				} break;
			} break;
		} })());
	}
	get userAgent() {
		let ua = 'Mozilla/5.0 (';
		switch (this.browser) {
			case 'chrome': {
				switch (this.os) {
					case 'win': {
						ua += 'Windows NT '+ this.os_version;
						ua += archTag(this.arch);
					} break;
					// TODO
					default: {
						notInmplemented();
					}
				}
				ua += ') AppleWebKit/537.36 (KHTML, like Gecko)';
				ua += ' Chrome/'+ this.browser_version +'.'+ chromeSubVersion(this) +' Safari/537.36';
			} break;
			case 'firefox': {
				switch (this.os) {
					case 'win': {
						ua += 'Windows NT '+ this.os_version;
						ua += archTag(this.arch);
					} break;
					// TODO
					default: {
						notInmplemented();
					}
				}
				ua += '; rv:'+ this.browser_version +') Gecko/'+ this.productSub;
				ua += ' Firefox/'+ this.browser_version +'';
			} break;
			case 'ie': {
				const version = +this.browser_version.split('.')[0];
				if (version >= 12) { // edge
					// Mozilla/5.0 (Windows NT 10.0; <64-bit tags>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Safari/<WebKit Rev> Edge/<EdgeHTML Rev>.<Windows Build>
					// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246
					// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240
					ua += 'Windows NT 10.0';
					ua += archTag(this.arch);
					ua += ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/';
					ua += '42.0.2311.135 '; // TODO
					ua += 'Safari/537.36 Edge/'+ this.browser_version;
				} else if (version >= 11) {
					// Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko
					// Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko
					// Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko
					ua += 'Windows NT '+ this.os_version;
					ua += archTag(this.arch);
					ua += '; Trident/'+ (version - 4) +'.0';
					ua += this.ie_feature.map(s => '; '+ s).join('');
					ua += '; rv:11.0)';
				} else {
					// Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)
					// Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/4.0; InfoPath.2; SV1; .NET CLR 2.0.50727; WOW64)
					ua += 'compatible; MSIE '+ version +'.0; ';
					ua += 'Windows NT '+ this.os_version;
					ua += archTag(this.arch);
					ua += '; Trident/'+ (version - 4) +'.0';
					ua += this.ie_feature.map(s => '; '+ s).join('');
					ua += ')';
				}
			} break;
			default: {
				notInmplemented();
			}
		}
		return setValue(this, 'userAgent', ua);
	}
	get productSub() {
		return '20121011'; // TODO
	}

	toJSON() {
		if (this.json) { return this.json; }
		const json = { };
		Generator.keys.forEach(key => json[key] = this[key]);
		return (this.json = json);
	}
}

function setValue(object, key, value) {
	Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true, });
	return value;
}

function archTag(arch) {
	switch (arch) {
		case '32_32': return '';
		case '32_64': return '; WOW64';
		case '64_64': return '; Win64; x64';
	}
}

function chromeSubVersion(arg) {
	const version = crome_build[arg.browser_version];
	return randInRange(version.a, arg.random) +'.'+ randInRange(version.b, arg.random);
}

function ieFeatures(arg) {
	notInmplemented();
	return '246'; // TODO
}

function parseRange(arg, def) {
	if (arg == null) { return def; }
	if (typeof arg === 'object') {
		let from = 'from' in arg ? arg.from : arg.to || 0;
		let to = 'to' in arg ? arg.to : arg.from || 0;
		if (to < from) { let tmp = from; from = to; to = tmp; }
		return { from, to, };
	}
	return { from: +arg || 0, to: +arg || 0, };
}

function randInRange(range, random = rand()) {
	return range.from + (random % (range.to - range.from + 1));
}

function rand() {
	return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function chooseFirst(array, minDate) {
	return array.find(({ date, }) => date > minDate);
}

function chooseWeightedRandom(array) {
	addTotalParts(array);
	let r = Math.random() * array.total_parts << 0;
	return array.find(({ parts, }) => (r -= parts) <= 0);
}

function chooseSomeRandom(array, range) {
	let size = randInRange(range);
	let result = new Set;
	while (result.size < size) { result.add(chooseWeightedRandom(array)); }
	return Array.from(result);
}

function addTotalParts(array) {
	if (array.total_parts) { return; }
	array.total_parts = array.reduce((sum, { parts, }) => sum + parts, 0);
}

function notInmplemented() {
	throw new Error('not implemented');
}

const moduleName = 'background/ua'; if (typeof module !== 'undefined') { module.exports = exports; } else if (typeof define === 'function') { define(moduleName, exports); } else if (typeof window !== 'undefined' && typeof module === 'undefined') { window[moduleName] = exports; } return exports; })({ });
