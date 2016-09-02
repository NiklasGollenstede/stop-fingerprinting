(() => { 'use strict'; define(function(_, exports) { // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * links:
 * firefox: https://developer.mozilla.org/de/docs/Gecko_user_agent_string_referenz
 * ie/edge: https://msdn.microsoft.com/en-us/library/hh869301(v=vs.85).aspx
 */

const browser_os = [
	{ parts: 100, browser: 'chrome',  os: 'win', },
	{ parts:  10, browser: 'chrome',  os: 'mac', },
	{ parts:  10, browser: 'chrome',  os: 'lin', },
	{ parts: 100, browser: 'ie',	  os: 'win', },
	{ parts:  25, browser: 'firefox', os: 'win', },
	{ parts:   5, browser: 'firefox', os: 'mac', },
	{ parts:   7, browser: 'firefox', os: 'lin', },
	// { parts:   8, browser: 'opera',   os: 'win', }, // TODO
	// { parts:   1, browser: 'opera',   os: 'mac', }, // TODO
	// { parts:   1, browser: 'opera',   os: 'lin', }, // TODO
	// { parts:  20, browser: 'safari',  os: 'mac', }, // TODO
];

const osArch = [
	{ parts: 100, arch: '32_32', },
	{ parts: 100, arch: '32_64', },
	{ parts: 100, arch: '64_64', },
];

const osVersion = {
	win: [
		{ date: +new Date('2015-07'), version: [ 10,  0, 0, ], }, // win 10 (XXX: also 6.4?)
		{ date: +new Date('2013-09'), version: [  6,  3, 0, ], }, // win 8.1
		{ date: +new Date('2012-09'), version: [  6,  2, 0, ], }, // win 8
		{ date: +new Date('2009-09'), version: [  6,  1, 0, ], }, // win 7
		{ date: +new Date('2007-06'), version: [  6,  1, 0, ], }, // win vista
		{ date: +new Date('2001-09'), version: [  5,  1, 0, ], }, // win XP
	],
	mac: [
		{ date: +new Date('2016-05-16'), version: [ 10, 11,  5, ], },
		{ date: +new Date('2016-03-21'), version: [ 10, 11,  4, ], },
		{ date: +new Date('2016-01-19'), version: [ 10, 11,  3, ], },
		{ date: +new Date('2015-12-08'), version: [ 10, 11,  2, ], },
		{ date: +new Date('2015-10-21'), version: [ 10, 11,  1, ], },
		{ date: +new Date('2015-09-30'), version: [ 10, 11,  0, ], },
		{ date: +new Date('2015-08-13'), version: [ 10, 10,  5, ], },
		{ date: +new Date('2015-06-30'), version: [ 10, 10,  4, ], },
		{ date: +new Date('2015-04-08'), version: [ 10, 10,  3, ], },
		{ date: +new Date('2015-01-27'), version: [ 10, 10,  2, ], },
		{ date: +new Date('2014-11-17'), version: [ 10, 10,  1, ], },
		{ date: +new Date('2014-10-16'), version: [ 10, 10,  0, ], },
		{ date: +new Date('2014-09-18'), version: [ 10,  9,  5, ], },
		{ date: +new Date('2014-06-30'), version: [ 10,  9,  4, ], },
		{ date: +new Date('2014-05-15'), version: [ 10,  9,  3, ], },
		{ date: +new Date('2014-02-25'), version: [ 10,  9,  2, ], },
		{ date: +new Date('2013-12-16'), version: [ 10,  9,  1, ], },
		{ date: +new Date('2013-10-22'), version: [ 10,  9,  0, ], },
		{ date: +new Date('2013-10-03'), version: [ 10,  8,  5, ], },
		{ date: +new Date('2013-06-04'), version: [ 10,  8,  4, ], },
		{ date: +new Date('2013-03-14'), version: [ 10,  8,  3, ], },
		{ date: +new Date('2012-09-19'), version: [ 10,  8,  2, ], },
		{ date: +new Date('2012-08-23'), version: [ 10,  8,  1, ], },
		{ date: +new Date('2012-10-04'), version: [ 10,  7,  5, ], },
		{ date: +new Date('2012-05-09'), version: [ 10,  7,  4, ], },
		{ date: +new Date('2012-02-01'), version: [ 10,  7,  3, ], },
		{ date: +new Date('2011-10-12'), version: [ 10,  7,  2, ], },
		{ date: +new Date('2011-08-16'), version: [ 10,  7,  1, ], },
		{ date: +new Date('2011-06-23'), version: [ 10,  6,  8, ], },
		{ date: +new Date('2011-01-06'), version: [ 10,  6,  7, ], },
		{ date: +new Date('2010-11-10'), version: [ 10,  6,  6, ], },
		{ date: +new Date('2010-06-15'), version: [ 10,  6,  5, ], },
		{ date: +new Date('2010-04-12'), version: [ 10,  6,  4, ], },
		{ date: +new Date('2010-03-29'), version: [ 10,  6,  3, ], },
		{ date: +new Date('2009-11-09'), version: [ 10,  6,  2, ], },
		{ date: +new Date('2009-08-28'), version: [ 10,  6,  0, ], },
		{ date: +new Date('2009-08-05'), version: [ 10,  5,  8, ], },
		{ date: +new Date('2009-02-11'), version: [ 10,  5,  7, ], },
		{ date: +new Date('2008-12-16'), version: [ 10,  5,  6, ], },
		{ date: +new Date('2008-09-15'), version: [ 10,  5,  5, ], },
		{ date: +new Date('2008-06-30'), version: [ 10,  5,  4, ], },
		{ date: +new Date('2008-05-28'), version: [ 10,  5,  3, ], },
		{ date: +new Date('2008-02-11'), version: [ 10,  5,  2, ], },
		{ date: +new Date('2007-11-15'), version: [ 10,  5,  1, ], },
		{ date: +new Date('2007-10-26'), version: [ 10,  5,  0, ], },
		{ date: +new Date('2007-11-14'), version: [ 10,  4, 11, ], },
		{ date: +new Date('2007-06-20'), version: [ 10,  4, 10, ], },
		{ date: +new Date('2007-03-13'), version: [ 10,  4,  9, ], },
		{ date: +new Date('2006-09-29'), version: [ 10,  4,  8, ], },
		{ date: +new Date('2006-06-27'), version: [ 10,  4,  7, ], },
		{ date: +new Date('2006-04-03'), version: [ 10,  4,  6, ], },
		{ date: +new Date('2006-02-14'), version: [ 10,  4,  5, ], },
		{ date: +new Date('2006-02-14'), version: [ 10,  4,  5, ], },
		{ date: +new Date('2006-01-10'), version: [ 10,  4,  4, ], },
		{ date: +new Date('2006-01-10'), version: [ 10,  4,  4, ], },
		{ date: +new Date('2005-10-31'), version: [ 10,  4,  3, ], },
		{ date: +new Date('2005-06-12'), version: [ 10,  4,  2, ], },
		{ date: +new Date('2005-05-16'), version: [ 10,  4,  1, ], },
		{ date: +new Date('2005-04-29'), version: [ 10,  4,  0, ], },
	],
	lin: [
		{ date: 0, version: [ 0, 0, 0, ], },
	],
};

const browserVersion = {
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
		{ date:                        0, version: '11.0', },
	],
	opera: [ ], // TODO
	safari: [ ], // TODO
};

const cromeBuild = {
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
	'53.0': { a: { from: 2770, to: 2810 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'54.0': { a: { from: 2810, to: 2840 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'55.0': { a: { from: 2840, to: 2890 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
	'56.0': { a: { from: 2890, to: 2930 - 1, }, b: { from: 0, to: 120, }, }, // estimated / guessed
};

const ieFeature = [
	{ parts: 1, feature: 'SV1', },
	{ parts: 1, feature: 'SLCC1', },
	{ parts: 1, feature: 'SLCC2', },
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

const cpuCores = [
	{ parts:  5 / 1, physical: 1, virtual: 1 * 1, },
	{ parts:  5 / 2, physical: 1, virtual: 1 * 2, },
	{ parts: 95 / 1, physical: 2, virtual: 2 * 1, },
	{ parts: 95 / 2, physical: 2, virtual: 2 * 2, },
	{ parts:  6 / 1, physical: 3, virtual: 3 * 1, },
	{ parts:  6 / 2, physical: 3, virtual: 3 * 2, },
	{ parts: 90 / 1, physical: 4, virtual: 4 * 1, },
	{ parts: 90 / 2, physical: 4, virtual: 4 * 2, },
	{ parts:  3 / 1, physical: 6, virtual: 6 * 1, },
	{ parts:  3 / 2, physical: 6, virtual: 6 * 2, },
	{ parts:  1 / 1, physical: 8, virtual: 8 * 1, },
	{ parts:  1 / 2, physical: 8, virtual: 8 * 2, },
];

const headerOrder = {
	chrome: Object.freeze([
		'Host',
		'Connection',
		'Cache-Control',
		'If-None-Match',
		'If-Modified-Since',
		'Upgrade-Insecure-Requests', // (maybe above 'If-...')
		'User-Agent',
		'Accept',
		'DNT',
		'Referer',
		'Accept-Encoding',
		'Accept-Language',
		'Origin', // TODO: find correct position
	]),
	firefox: Object.freeze([
		'Host',
		'User-Agent',
		'Accept',
		'Accept-Language',
		'Accept-Encoding',
		'Referer',
		'DNT',
		'Origin',
		'Connection',
		'Upgrade-Insecure-Requests',
		'If-Modified-Since',
		'If-None-Match',
		'Cache-Control',
	]),
	ie: Object.freeze([
		'Accept',
		'Referer',
		'Accept-Language',
		'User-Agent',
		'Accept-Encoding',
		'Host',
		'If-Modified-Since',
		'If-None-Match',
		'DNT',
		'Connection',
		'Upgrade-Insecure-Requests', // TODO: find correct position
		'Origin', // TODO: find correct position
		// TODO: Cache-Control not sent ?
	]),
	opera: Object.freeze([ ]), // TODO
	safari: Object.freeze([ ]), // TODO
};

const accept = { // TODO: for 'other': implement some kind of translation between the browsers
	chrome: Object.freeze({
		main_frame: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		sub_frame: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		image: '*/*',
		script: '*/*',
		style: 'text/css,*/*;q=0.1',
		object: '*/*',
		other: '',
	}),
	firefox: Object.freeze({
		main_frame: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		sub_frame: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		image: '*/*',
		script: '*/*',
		style: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', // ?
		object: '',
		other: '',
	}),
	ie: Object.freeze({
		main_frame: 'text/html, application/xhtml+xml, image/jxr, */*',
		sub_frame: 'text/html, application/xhtml+xml, image/jxr, */*',
		image: 'image/png, image/svg+xml, image/jxr, image/*;q=0.8, */*;q=0.5',
		script: 'application/javascript, */*;q=0.8',
		style: 'text/css, */*',
		object: '',
		other: '',
	}),
};

const acceptLanguage = {
	chrome: Object.freeze({
		'en-US': 'en-US,en;q=0.8',
	}),
	firefox: Object.freeze({
		'en-US': 'en-US,en;q=0.5',
	}),
	ie: Object.freeze({
		'en-US': 'en-US,en;q=0.5',
	}),
};

const acceptEncoding = {
	chrome: 'gzip, deflate, sdch, br',
	firefox: 'gzip, deflate, br',
	ie: 'gzip, deflate',
};

const Generator = exports.Generator = class Generator {
	constructor(config = { }) {
		this.browser_os = browser_os.filter(({ browser, os, }) => (!config.browser || config.browser.includes(browser)) && (!config.os || config.os.includes(os)));
		this.osArch = config.arch ? osArch.filter(({ arch, }) => config.arch.includes(arch)) : osArch;
		const coreRange = parseRange(config.cpuCores, { from: 1, to: 16, });
		this.cpuCores = cpuCores.filter(({ virtual, }) => isIn(virtual, coreRange));
		this.osAge = parseRange(config.osAge, { from: 0, to: 3, });
		this.browserAge = parseRange(config.browserAge, { from: -1, to: 12, });
		this.ieFeatureCount = parseRange(config.ieFeatureCount, { from: 0, to: 3, });
		this.ieFeature = config.ieFeatureExclude ? ieFeature.filter(({ feature, }) => !feature.match(config.ieFeatureExclude)) : ieFeature;
		this.dntChance = parseRange(config.dntChance, { from: 1, to: 30, });
		config.noThrow ? this.makeValid() : this.validate();
	}
	makeValid() {
		if (!this.browser_os.length) { this.browser_os = browser_os; }
		if (!this.cpuCores.length) { this.cpuCores = cpuCores; }
		if (!this.osArch.length) { this.osArch = osArch; }
		if (this.ieFeatureCount.to && !this.ieFeature.length) { this.ieFeature = ieFeature; }
	}
	validate() {
		if (!this.browser_os.length) { throw new Error('No possible combinations of operating system and browser type'); }
		if (!this.cpuCores.length) { throw new Error('No CPU code count allowed'); }
		if (!this.osArch.length) { throw new Error('No operating system architecture allowed'); }
		if (this.ieFeatureCount.to && !this.ieFeature.length) { throw new Error('All Internet Explorer features are excluded'); }
	}
	navigator() {
		return new Navigator(this);
	}
	generate() {
		return this.navigator();
	}
};

const Navigator = exports.Navigator = class Navigator {
	constructor(config) {
		const { os, browser, } = chooseWeightedRandom(config.browser_os);
		this.os = os; this.browser = browser;
		this.headerOrder = headerOrder[browser];
		this.accept = accept[browser];
		this.acceptLanguage = acceptLanguage[browser];
		this.acceptEncoding = acceptEncoding[browser];
		this.arch = chooseWeightedRandom(config.osArch).arch;
		const osRelease = this.osRelease = Date.now() - randInRange(config.osAge) * 31536000000/*1 year*/;
		this.osVersion = (osVersion[this.os].find(({ date, }) => date < osRelease) || chooseRandom(osVersion[this.os])).version;
		const browserRelease = this.browserRelease = Date.now() - randInRange(config.browserAge) * 604800000/*1 week*/;
		this.browserVersion = (browserVersion[this.browser].find(({ date, }) => date < browserRelease) || chooseRandom(browserVersion[this.browser])).version;
		this.browser === 'ie' && (this.ieFeature = chooseSomeRandom(config.ieFeature, config.ieFeatureCount).map(({ feature, }) => feature));
		const randA = Math.random();
		this.dntValue = randA < config.dntChance.from / 100 ? '0' : randA < config.dntChance.to / 100 ? '1' : null;
		this.cpuCores = chooseWeightedRandom(config.cpuCores).virtual;
		this.json = null;
	}
	get appName() {
		return 'Netscape';
	}
	get appVersion() {
		if (this.browser !== 'firefox') {
			return this.userAgent.replace(/^Mozilla\//, '');
		}
		return '5.0 ('+ this.userAgent.match(/^Mozilla\/5\.0 \((\w+)/)[1] +')';
	}
	get buildID() {
		if (this.browser !== 'firefox') { return undefined; }
		return new Date(this.browserRelease).toISOString().replace(/[-T:]|\..*/g, ''); // this should be unique per version/patch_version/os/bitness
	}
	get hardwareConcurrency() {
		return this.cpuCores;
	}
	get oscpu() {
		if (this.browser !== 'firefox') { return undefined; }
		return firefoxOscpu(this);
	}
	get platform() {
		switch (this.os) {
			case 'win': {
				if (this.browser !== 'firefox') { return 'Win32'; }
				switch (this.arch) {
					case '32_32': return 'Win32';
					case '32_64': return 'WOW64';
					case '64_64': return 'Win64';
				}
			} break;
			case 'mac': {
				return 'MacIntel';
			} break;
			case 'lin': {
				return linuxArchTag(this); // TODO: verify
			} break;
		}
	}
	get productSub() {
		switch (this.browser) {
			case 'chrome':  return '20030107';
			case 'firefox': return '20100101';
			case 'ie':      return this.browserVersion >= 12 ? '20030107' : undefined;
			case 'opera':   return '20030107';
			case 'safari':  return '20030107';
		}
	}
	get userAgent() {
		let ua = 'Mozilla/5.0 (';
		switch (this.browser) {
			case 'chrome': {
				switch (this.os) {
					case 'win': {
						ua += 'Windows NT '+ this.osVersion[0] +'.'+ this.osVersion[1];
						ua += windowsArchTag(this.arch);
					} break;
					case 'mac': {
						ua += 'Macintosh; Intel Mac OS X '+ this.osVersion[0] +'_'+ this.osVersion[1] +'_'+ this.osVersion[2];
					} break;
					case 'lin': {
						ua += 'X11; '+ linuxArchTag(this.arch);
					} break;
				}
				ua += ') AppleWebKit/537.36 (KHTML, like Gecko)';
				// TODO: if linux add 'Ubuntu' ?
				ua += ' Chrome/'+ this.browserVersion +'.'+ chromeSubVersion(this) +' Safari/537.36';
			} break;
			case 'firefox': {
				switch (this.os) {
					case 'win': break;
					case 'mac': ua += 'Macintosh; '; break;
					case 'lin': ua += 'X11; '; break;
				}
				ua += this.oscpu;
				ua += '; rv:'+ this.browserVersion +') Gecko/'+ this.productSub;
				ua += ' Firefox/'+ this.browserVersion +'';
			} break;
			case 'ie': {
				const version = +this.browserVersion.split('.')[0];
				if (version >= 12) { // edge
					// Mozilla/5.0 (Windows NT 10.0; <64-bit tags>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Safari/<WebKit Rev> Edge/<EdgeHTML Rev>.<Windows Build>
					// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246
					// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240
					ua += 'Windows NT 10.0';
					ua += windowsArchTag(this.arch);
					ua += ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/';
					ua += '42.0.2311.135 '; // TODO: this is version dependant (e.g. edge 13.10586 has 46.0.2486.0)
					ua += 'Safari/537.36 Edge/'+ this.browserVersion;
				} else if (version >= 11) {
					// Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko
					// Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko
					// Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko
					ua += 'Windows NT '+ this.osVersion[0] +'.'+ this.osVersion[1];
					ua += windowsArchTag(this.arch);
					ua += '; Trident/'+ (version - 4) +'.0';
					ua += this.ieFeature.map(s => '; '+ s).join('');
					ua += '; rv:11.0)';
				} else {
					// Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)
					// Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/4.0; InfoPath.2; SV1; .NET CLR 2.0.50727; WOW64)
					ua += 'compatible; MSIE '+ version +'.0; ';
					ua += 'Windows NT '+ this.osVersion[0] +'.'+ this.osVersion[1];
					ua += windowsArchTag(this.arch);
					ua += '; Trident/'+ (version - 4) +'.0';
					ua += this.ieFeature.map(s => '; '+ s).join('');
					ua += ')';
				}
			} break;
			default: {
				notInmplemented();
			}
		}
		return ua;
	}
	get vendor() {
		switch (this.browser) {
			case 'chrome':  return 'Google Inc.';
			case 'firefox': return '';
			case 'ie':      return '';
			case 'opera':   return 'Opera Software ASA';
			case 'safari':  return 'Apple Computer, Inc.';
		}
	}
	get vendorSub() {
		return '';
	}

	get doNotTrack() {
		switch (this.dntValue) {
			case '0': return '0';
			case '1': return '1';
		}
		switch (this.browser) {
			case 'firefox': return 'unspecified';
			case 'ie': return undefined;
		}
		return null;
	}

	toJSON() {
		if (this.json) { return this.json; }
		const json = { }, undef = [ ];
		Navigator.keys.forEach(key => {
			const value = this[key];
			if (value === undefined) { return undef.push(key); }
			json[key] = value;
		});
		json.undefinedValues = undef;
		return (this.json = json);
	}
};
Navigator.keys = Object.getOwnPropertyNames(Navigator.prototype).filter(key => {
	const getter = Object.getOwnPropertyDescriptor(Navigator.prototype, key).get;
	if (!getter) { return false; }
	Object.defineProperty(Navigator.prototype, key, { get() {
		const value = getter.call(this);
		Object.defineProperty(this, key, { value, configurable: true, });
		return value;
	}, });
	return true;
});

function setValue(object, key, value) {
	Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true, });
	return value;
}

function windowsArchTag(arch) {
	switch (arch) {
		case '32_32': return '';
		case '32_64': return '; WOW64';
		case '64_64': return '; Win64; x64';
	}
}

function linuxArchTag(arch) {
	switch (arch) {
		case '32_32': return 'Linux i686';
		case '32_64': return 'Linux i686 on x86_64';
		case '64_64': return 'Linux x86_64';
	}
}

function chromeSubVersion(nav) {
	const version = cromeBuild[nav.browserVersion];
	return randInRange(version.a, nav.random) +'.'+ randInRange(version.b, nav.random);
}

function firefoxOscpu(nav) {
	switch (nav.os) {
		case 'win': {
			return 'Windows NT '+ nav.osVersion[0] +'.'+ nav.osVersion[1] + windowsArchTag(nav.arch);
		} break;
		case 'mac': {
			return 'Intel Mac OS X '+ nav.osVersion[0] +'.'+ nav.osVersion[1];
		} break;
		case 'lin': {
			return linuxArchTag(nav.arch);
		} break;
	}
}

function isIn(value, range) {
	return value >= range.from && value <= range.to;
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

function chooseRandom(array) {
	let r = Math.random() * array.length << 0;
	return array[r];
}

function chooseWeightedRandom(array) {
	addTotalParts(array);
	let r = Math.random() * array.totalParts;
	return array.find(({ parts, }) => (r -= parts) <= 0);
}

function chooseSomeRandom(array, range) {
	let size = randInRange(range);
	if (size >= array.length) { return array; }
	let result = new Set;
	while (result.size < size) { result.add(chooseWeightedRandom(array)); }
	return Array.from(result);
}

function addTotalParts(array) {
	if (array.totalParts) { return; }
	array.totalParts = array.reduce((sum, { parts, }) => sum + parts, 0);
}

function notInmplemented() {
	throw new Error('not implemented');
}

}); })();
