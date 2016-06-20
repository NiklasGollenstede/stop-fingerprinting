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
							(?: \* | http | https | file | ftp ) # <scheme>
							:\/\/
							(?: \* | (?:\*\.)? [^\/\*]+ | ) # <host>
							\/
							(?: .* ) # <path>
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
		description: 'Set the rules that should apply to all matching sites, any rules that are not set will be filled in by matching profiles with lower priorities or the extensions default values',
		type: 'label',
		children: [
			optional({
				name: 'disabled',
				title: 'Disable',
				description: 'Completely disable this extension for all matching sites',
				addDefault: true,
				type: 'bool',
			}), optional({
				name: 'hstsDisabled',
				title: 'Disable HSTS',
				description: `<pre>
Completely disable <a href="https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security">HTTP Strict Transport Security</a> (HSTS) for all matching sites.
HSTS is a security feature that makes the browser remember that a specific URL should only be used over https.
If an attacker tires to redirect the connection over insecure http, the browser will then reject the connection.
Unfortunately this stored information can be read out and used as a <a href="http://www.radicalresearch.co.uk/lab/hstssupercookies">super cookie</a>.
If you disable HSTS you should be even more careful to always look for the (green) lock symbol next or the URL-bar on any security relevant sites.
Enabling this will only prevent the creation of new HSTS super cookies, any existing ones need to be deleted via the browsers 'clear browsing data' functions.
THIS DOES NOT WORK IN FIREFOX (yet?)!
</pre>`,
				addDefault: true,
				type: 'bool',
			}), {
				name: 'navigator',
				title: 'Navigator and Requests',
				description: `Decide which values the window.navigator and some HTTP-request header fields should have.
				<br>These values are randomly generated according to the parameters below`,
				type: 'label',
				children: [
					optional({
						name: 'disabled',
						title: 'Disable',
						description: 'Disable User Agent spoofing for all matching sites and use the browsers default values',
						addDefault: true,
						type: 'bool',
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
							{ value: 'mac', label: 'Mac OS', },
							{ value: 'lin', label: 'Linux', },
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
						name: 'cpuCores',
						title: 'CPU cores',
						description: 'Number of (virtual) CPU cores',
						restrict: { from: 1, to: 16, type: 'number', },
						addDefault: { from: 1, to: 8, },
						type: 'interval',
					}), optional({
						name: 'osAge',
						title: 'Operating Systems Age',
						description: 'The age of the operating system version',
						unit: 'years',
						restrict: { from: 0, to: 11, type: 'number', },
						addDefault: { from: 0, to: 3, },
						type: 'interval',
					}), optional({
						name: 'dntChance',
						title: 'Do-Not-Track header',
						description: `If you would trust the <a href="https://en.wikipedia.org/wiki/Do_Not_Track">Do Not Track</a> concept, you wouldn't be using this extension.
						<br>So the best use for it is probably to send random values`,
						unit: '<chance to set the header> - <chance to opt in to tracking>',
						addDefault: { from: 30, to: 3, },
						restrict: { from: 0, to: 100, type: 'number', },
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
			}, {
				name: 'plugins',
				title: 'Plugins',
				description: `By default scripts can enumerate the plugins installed on your OS / in your browser`,
				type: 'label',
				children: [
					optional({
						name: 'hideAll',
						title: 'Hide all',
						description: `Makes the browser report that there are no plugins installed. If a website decides to load a plugin anyway, that plugin will still work. It is not disabled, just hidden from enumeration`,
						addDefault: true,
						type: 'bool',
					}),
				]
			}, {
				name: 'devices',
				title: 'Media Devices',
				description: `By default scripts can detect the audio/video input hardware of your computer`,
				type: 'label',
				children: [
					optional({
						name: 'hideAll',
						title: 'Hide all',
						description: `Makes the browser report that there are no media devices available`,
						addDefault: true,
						type: 'bool',
					}),
				]
			}, optional({
				name: 'keepWindowName', // TODO: implement
				title: 'Allow window.name',
				description: `Unless checked, the window.name property gets reset at every load`,
				addDefault: true,
				type: 'bool',
			}), {
				name: 'screen',
				title: 'Screen',
				description: `Decide which values the window.screen and and window.devicePixelRatio should have.
				<br>These values are randomly generated according to the parameters below`,
				type: 'label',
				children: [
					optional({
						name: 'disabled',
						title: 'Disable',
						description: 'Expose your true screen values to the websites',
						addDefault: true,
						type: 'bool',
					}), optional({
						name: 'devicePixelRatio',
						title: 'devicePixelRatio',
						addDefault: { from: 1, to: 1.5, },
						restrict: { from: 0.5, to: 8, type: 'number', },
						type: 'interval',
					}), optional({
						name: 'width',
						title: 'screen.width',
						addDefault: { from: 1368, to: 3840, },
						restrict: { from: 1024, to: 8192, type: 'number', },
						unit: 'pixels',
						type: 'interval',
					}), optional({
						name: 'height',
						title: 'screen.height',
						addDefault: { from: 768, to: 2160, },
						restrict: { from: 600, to: 8192, type: 'number', },
						unit: 'pixels',
						type: 'interval',
					}), optional({
						name: 'ratio',
						title: 'Aspect ratio',
						description: 'The quotient screen.width / screen.height',
						addDefault: { from: 1.3, to: 2.4, },
						restrict: { from: 0.5, to: 8, type: 'number', },
						type: 'interval',
					}), {
						name: 'offset',
						title: 'Offset',
						description: 'The amount of space at each edge of the screen that is occupied by task/title bars etc.',
						type: 'label',
						children: [
							optional({
								name: 'top',
								title: 'Top',
								addDefault: { from: 0, to: 0, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}), optional({
								name: 'right',
								title: 'Right',
								addDefault: { from: 0, to: 0, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}), optional({
								name: 'bottom',
								title: 'Bottom',
								addDefault: { from: 30, to: 50, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}), optional({
								name: 'left',
								title: 'Left',
								addDefault: { from: 0, to: 0, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}),
						],
					},
				],
			}, {
				name: 'fonts',
				title: 'Fonts',
				description: `The set of fonts installed on a computer can be quite unique.
				<br>There are simple ways to detect these fonts:
				<ul>
					<li>Plugins like flash allow to list the fonts directly</li>
					<li>JavaScript can test the presence of a font by displaying (hidden) text in that font and checking how it is rendered</li>
				</ul>
				`,
				type: 'label',
				children: [
					optional({
						name: 'disabled',
						title: 'Disable',
						description: `Don't use any technique to hide the set of installed fonts`,
						addDefault: true,
						type: 'bool',
					}), optional({
						name: 'dispersion',
						title: 'JavaScript randomness',
						description: `To prevent JavaScript from detecting fonts, this adds some randomness to the size of text elements.
						<br>On most websites this should not have any visible effects, but the font detection will effectively disabled if the randomness is greater zero`,
						unit: '%',
						addDefault: 25,
						restrict: { from: 0, to: 75, },
						type: 'number',
					}),
				],
			}, {
				name: 'canvas',
				title: 'Canvas',
				description: `<pre>
Websites are able to draw custom images on special &lt;canvas&gt; elements.
Since different browsers on different operation systems on different hardware draw a little different on different screens, reading these images allows for browser fingerprinting
</pre>`,
				type: 'label',
				children: [
					optional({
						name: 'disabled',
						title: 'Disable',
						description: `Don't use any technique manipulate canvas fingerprints`,
						addDefault: true,
						type: 'bool',
					}), ({
						name: 'randomize',
						title: 'Randomize',
						description: `<pre>
Currently the only technique to disable canvas fingerprinting is to add random noise to &lt;canvas&gt; images when they are read.
You can't configure anything about that yet
</pre>`,
						type: 'label',
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
