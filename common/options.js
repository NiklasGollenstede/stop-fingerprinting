(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/object': { deepFreeze, },
	'node_modules/regexpx/': RegExpX,
	'node_modules/web-ext-utils/options/': Options,
	'node_modules/web-ext-utils/chrome/': { Storage, applications: { blink, }, },
	utils: { DOMAIN_CHARS, },
}) {

const model = deepFreeze({
	debug: {
		title: 'Enable debugging',
		description: `Enable some stuff that can definitely be used to compromise your privacy and security but is helpful when debugging`,
		type: 'bool',
		default: false,
		expanded: false,
	},
	profiles: {
		maxLength: Infinity,
		restrict: { match: (/^\{[0-9a-f\-]{40}\}$/), unique: '.', },
		type: 'hidden',
	},
	addProfile: {
		title: 'Add new profile',
		default: 'Add',
		type: 'control',
	},
});

const listerners = new WeakMap;

const options = (yield new Options({
	model,
	prefix: 'options',
	storage: Storage.sync,
	addChangeListener(listener) {
		const onChanged = changes => Object.keys(changes).forEach(key => key.startsWith('options') && listener(key, changes[key].newValue));
		listerners.set(listener, onChanged);
		Storage.onChanged.addListener(onChanged);
	},
	removeChangeListener(listener) {
		const onChanged = listerners.get(listener);
		listerners.delete(listener);
		Storage.onChanged.removeListener(onChanged);
	},
}));

options.model = model;

return Object.freeze(options);

}); })();
