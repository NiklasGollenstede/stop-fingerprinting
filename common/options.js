'use strict'; define('common/options', [
	'web-ext-utils/options',
	'web-ext-utils/chrome',
	'es6lib/format',
], function(
	Options,
	{ storage: Storage, },
	{ RegExpX, }
) {

const defaults = [
	{
		name: 'debug',
		title: 'Enable debugging',
		description: `Enable some stuff that will definetly compromise your privacy but is helpful when debugging`,
		type: 'bool',
		default: false,
	}, {
		name: 'profiles',
		maxLength: Infinity,
		restrict: { match: (/^\{[0-9a-f\-]{40}\}$/), unique: '.', },
		type: 'hidden',
	}, {
		name: 'addProfile',
		title: 'Add new profile',
		default: 'Add',
		type: 'control',
	},
];

const listerners = new WeakMap;

return new Options({
	defaults,
	prefix: 'options',
	storage: Storage.sync || Storage.local,
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
});


});
