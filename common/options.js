(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/regexpx/': RegExpX,
	'node_modules/web-ext-utils/options/': Options,
}) => {

const isBeta = true || (/^\d+\.\d+.\d+(?!$)/).test((global.browser || global.chrome).runtime.getManifest().version); // version doesn't end after the 3rd number ==> bata channel

const model = {
	debug: {
		title: 'Debug Level',
		expanded: true,
		default: +isBeta,
		hidden: !isBeta,
		restrict: { type: 'number', from: 0, to: 2, },
		input: { type: 'integer', suffix: 'set to > 0 to enable debugging', },
	},
	profiles: {
		maxLength: Infinity,
		restrict: { match: RegExpX('i')`^ \{ [\da-f]{8} - [\da-f]{4} - 4 [\da-f]{3} - 8 [\da-f]{3} - [\da-f] {12} \} $`, unique: '.', },
		hidden: true,
	},
	addProfile: {
		title: 'Add new profile',
		default: true,
		input: { type: 'control', id: 'add', label: 'Add', },
	},
};

return (await new Options({ model, })).children;

}); })(this);
