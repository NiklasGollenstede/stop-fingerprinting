'use strict'; define('common/profile', [
	'web-ext-utils/options',
	'web-ext-utils/chrome',
	'es6lib',
], function(
	Options,
	{ storage: Storage, },
	{
		format: { RegExpX, },
	}
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
	minLength: 0,
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
		description: `<pre>
You don't have to specify all possible parameters for a website in a single profile, multiple profiles can apply to the same site.
If a value is set in more than one profile, the value of the profile with the higher priority applies.
</pre>`,
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
				restrict: {
					match: {
						exp: RegExpX`^(?:
							( \* | http | https | file | ftp ) # <scheme>
							:\/\/
							( \* | (?:\*\.)? [^\/\*]+ | ) # <host>
							\/
							( .* ) # <path>
						)$`,
						message: 'Each pattern must be of the form <scheme>://<host>/<path>',
					},
					unique: '.',
				},
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
				restrict: { isRegExp: true, unique: '.', },
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
				name: 'disabled',
				title: 'Disable',
				description: 'Completely disable this extension for all matching sites',
				addDefault: true,
				type: 'bool',
			}), optional({
				name: 'devicePixelRatio',
				title: 'devicePixelRatio',
				addDefault: { from: 1, to: 1.5, type: 'number', },
				type: 'interval',
			}), {
				name: 'navigator',
				title: 'Navigator',
				description: `Decide which values the window.navigator and the User-Agent HTTP header should have.
				<br>These values are randomly generated according to the parameters below`,
				type: 'label',
				children: [
					optional({
						name: 'disabled',
						title: 'Disable',
						description: 'Disable User Agent spoofing for all matching sites and use the browsers default values',
						addDefault: true,
						type: 'bool',
					}), optional({
						name: 'maxAge',
						title: 'Lifetime',
						description: 'For any resulting set of rules the Navigator/User Agent will be randomly regenerated every:',
						addDefault: 10,
						unit: 'minutes',
						restrict: { from: 0.1, to: 45000/*~1 month*/, },
						type: 'number',
					}), ({
						name: 'browser',
						title: 'Browsers',
						description: 'The browsers that can be chosen from',
						type: 'menulist',
						addDefault: 'chrome',
						maxLength: 3,
						restrict: { unique: '.', },
						options: [
							{ value: 'chrome',  label: 'Chrome', },
							{ value: 'firefox', label: 'Firefox', },
							{ value: 'ie',      label: 'Internet Explorer / Edge', },
						],
					}), optional({
						name: 'browserAge',
						title: 'Browser Age',
						description: 'The age of the browser version, chose negative values to allow beta versions',
						unit: 'weeks',
						restrict: { from: -10, to: 150, type: 'number', },
						addDefault: { from: -1, to: 12, },
						type: 'interval',
					}), ({
						name: 'os',
						title: 'Operating Systems',
						description: 'The operating systems that can be chosen from',
						type: 'menulist',
						addDefault: 'win',
						maxLength: 3,
						restrict: { unique: '.', },
						options: [
							{ value: 'win', label: 'Windows', },
							// { value: 'mac', label: 'Mac OS', },
							// { value: 'lin', label: 'Linux', },
						],
					}), ({
						name: 'osArch',
						title: 'Processor Architecture',
						description: 'The processor and process architectures that can be chosen from',
						type: 'menulist',
						addDefault: '32_32',
						maxLength: 3,
						restrict: { unique: '.', },
						options: [
							{ value: '32_32', label: '32 bit', },
							{ value: '32_64', label: '32 on 64 bit', },
							{ value: '64_64', label: '64 bit', },
						],
					}), optional({
						name: 'osAge',
						title: 'Operating Systems Age',
						description: 'The age of the operating system version',
						unit: 'years',
						restrict: { from: 0, to: 10, type: 'number', },
						addDefault: { from: 0, to: 3, },
						type: 'interval',
					}), optional({
						name: 'ieFeatureCount',
						title: 'Number of Internet Explorer "features"',
						description: `This is rather a detail and only applies if an Internet Explorer User Agent is generated.
						<br>The IE User Agent contains things like the installed versions on .NET and others. This option restricts the number of these "features"`,
						restrict: { from: 0, to: 7, type: 'number', },
						addDefault: { from: 0, to: 4, },
						type: 'interval',
					}), optional({
						name: 'ieFeatureExclude',
						title: 'Exclude Internet Explorer "features"',
						description: `Any feature strings partially matched by the regular expression below will be excluded`,
						addDefault: '(?!)',
						restrict: { isRegExp: true, },
						type: 'string',
					}),
				],
			},
		],
	}, {
		name: 'manage',
		title: 'Manage profile',
		default: [ 'delete', ],
		type: 'control',
	},
];

const listerners = new WeakMap;

return id => new Options({
	defaults: [ {
		name: 'id',
		default: id,
		restrict: { match: RegExp(id), },
		type: 'hidden',
	}, ].concat(defaults),
	prefix: id,
	storage: Storage.sync || Storage.local,
	addChangeListener(listener) {
		const onChanged = changes => Object.keys(changes).forEach(key => key.startsWith(id) && listener(key, changes[key].newValue));
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