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
		name: 'weakenCsp',
		title: 'Weaken CSP',
		description: `<pre>
This extension works by injecting code into each page before the page content loads.
In order to do this, code injection has to be enabled on that site.
Some sites use a <a href="https://en.wikipedia.org/wiki/Content_Security_Policy">Content Security Policy</a> (CSP) to disable code injection.
Disallowing code injection is generally a good security practice, but it will render this extension useless on all sites that do so.
</pre>`,
		type: 'menulist',
		default: true,
		options: [
			{ value: true, label: 'Enable this extension, but waken the CSP', },
			{ value: false, label: 'Keep the CSP, but potentially disable this extension', },
		],
		restrict: { type: 'boolean', },
		unit: 'on sites that employ a CSP'
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

return new Options({
	defaults,
	prefix: 'options',
	storage: Storage.sync || Storage.local,
	addChangeListener: listener => {
		const onChanged = changes => Object.keys(changes).forEach(key => key.startsWith('options') && listener(key, changes[key].newValue));
		Storage.onChanged.addListener(onChanged);
	},
});


});
