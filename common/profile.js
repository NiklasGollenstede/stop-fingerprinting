'use strict'; define('common/profile', [
	'web-ext-utils/options',
	'web-ext-utils/chrome',
	'es6lib/format',
], function(
	Options,
	{ storage: Storage, },
	{ RegExpX, }
) {


const boolOption = {
	type: 'menulist',
	default: null,
	options: [
		{ value: null, label: 'unset', },
		{ value: true, label: 'yes', },
		{ value: false, label: 'no', },
	],
};
const optionalOption = {
	inLength: 0,
	maxLength: 1,
};
function optional(option) {
	return Object.assign(option, optionalOption);
}

const defaults = [
	{
		name: 'title',
		title: 'Profile name',
		default: 'New Profile',
		type: 'string',
	}, {
		name: 'priority',
		title: 'Profile priority',
		default: 0,
		restrict: { from: -Infinity, to: Infinity, },
		type: 'number',
	}, {
		name: 'include',
		title: 'Include urls',
		description: 'Decide to with sites this set of rules should apply.',
		type: 'label',
		children: [
			{
				name: 'pattern',
				title: 'Match Pattern',
				description: `<pre>
Sites whose urls matches any of the patterns below will be included.
Patterns are url-prefixes which allow * wildcards at certain positions.
They must have the form <code>&lt;scheme&gt;://&lt;host&gt;/&lt;path&gt;</code>
Read more about Match Patterns in <a href="https://developer.chrome.com/extensions/match_patterns">Googles documentation</a>.
Examples:
	<code>https://*.something.org/</code>
	<code>*://whatever.web/sites*</code>
	<code>https://just.one_domain.net/*</code>
</pre>`,
				maxLength: Infinity,
				addDefault: '*://*.domain.com/*',
				restrict: { match: RegExpX`^(?:
					( \* | http | https | file | ftp ) # <scheme>
					:\/\/
					( \* | (?:\*\.)? [^\/\*]+ | ) # <host>
					\/
					( .* ) # <path>
				)$`, unique: '.', message: 'Each pattern must be of the form <scheme>://<host>/<path>', },
				type: 'string',
			}, {
				name: 'regExp',
				title: 'Regular Expression',
				description: `<pre>
Sites whose urls entirely match any of the expressions below will be included.
Regular expressions are quite error prone, so unless you know exactly what you are doing, you should probably use the match patterns.
</pre>`,
				maxLength: Infinity,
				addDefault: String.raw`^(?:https?://www\.domain\.com/.*)$`,
				restrict: { type: 'string', unique: '.', },
				type: 'string',
			},
		],
	}, {
		name: 'rules',
		title: 'Rules',
		description: 'Decide to with sites this set of rules should apply.',
		type: 'label',
		children: [
			optional({
				name: 'disable',
				title: 'Disable',
				description: 'Completely disable this extension for all matching sites',
				addDefault: false,
				type: 'bool',
			}), optional({
				name: 'devicePixelRatio',
				title: 'devicePixelRatio',
				type: 'interval',
				default: { from: 1, to: 1.5, },
			}),
		],
	}, {
		name: 'manage',
		title: 'Manage profile',
		default: [ 'delete', ],
		type: 'control',
	},
];

return id => new Options({
	defaults: [ {
		name: 'id',
		default: id,
		restrict: { match: RegExp(id), },
		type: 'hidden',
	}, ].concat(defaults),
	prefix: id,
	storage: Storage.sync || Storage.local,
	addChangeListener: listener => {
		const onChanged = changes => Object.keys(changes).forEach(key => key.startsWith(id) && listener(key, changes[key].newValue));
		Storage.onChanged.addListener(onChanged);
	},
});


});
