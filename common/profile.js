define('common/profile', [ // license: MPL-2.0
	'common/utils',
	'web-ext-utils/options',
	'web-ext-utils/chrome',
	'es6lib',
], function(
	{ DOMAIN_CHARS, },
	Options,
	{ storage: Storage, applications, },
	{
		format: { RegExpX, },
		object: { deepFreeze, },
	}
) {

const optionalOption = {
	minLength: 0,
	maxLength: 1,
};
function optional(option) {
	return Object.assign(option, optionalOption);
}

const defaults = deepFreeze([
	{
		name: 'title',
		title: 'Profile name',
		default: 'New Profile',
		type: 'string',
	}, {
		name: 'description',
		title: 'Description',
		type: 'text',
		default: '',
		placeholder: `You can save notes about this profile here`,
		expanded: false,
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
		expanded: false,
	}, {
		name: 'include',
		title: 'Include urls',
		description: 'Decide to with sites this set of rules should apply.',
		type: 'label',
		default: true,
		expanded: false,
		children: [
			 {
				name: 'domain',
				title: 'Domains',
				description: ``, // TODO
				maxLength: Infinity,
				addDefault: `domain.com`,
				restrict: {
					match: {
						exp: RegExpX`^(?: ${ DOMAIN_CHARS }+ (?: \. ${ DOMAIN_CHARS }+ )+ )$`,
						message: `Each line must be domain name`,
					},
					unique: '.',
				},
				type: 'string',
			},
		],
	}, {
		name: 'rules',
		title: 'Rules',
		description: 'Set the rules that should apply to all matching sites, any rules that are not set will be filled in by matching profiles with lower priorities or the extensions default values',
		type: 'label',
		default: true,
		children: [
			optional({
				name: 'disabled',
				title: 'Disable',
				description: 'Completely disable this extension for all matching sites',
				addDefault: true,
				type: 'bool',
			}), optional({
				name: 'logLevel',
				title: 'Logging',
				description: 'Decide what priority of notifications you want to see',
				addDefault: 3,
				type: 'menulist',
				options: [
					{ value: 1, label: `Include debugging`, },
					{ value: 2, label: `Log everything`, },
					{ value: 3, label: `Important only`, },
					{ value: 4, label: `Errors only`, },
				],
			}), optional({
				name: 'lifetime',
				title: 'Values lifetime',
				description: 'Decide when to regenerate random values',
				addDefault: 'page',
				type: 'menulist',
				options: [
					// { value: 'browser',  label: `Browser: Only once on browser session. Kept until the browser is closed`, }, // TODO: (separate for private/incognito // mode)
					// { value: 'window',   label: `Window: Once per window. You should reload tabs if you move them between windows`, },
					// { value: 'tab',      label: `Tab: Separate for every tab`, },
					{ value: 'page',     label: `Page: Regenerate on every page reload`, },
				],
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
				expanded: false,
			}), optional({
				name: 'navigator',
				title: 'Navigator and Requests',
				description: `Decide which values the window.navigator and some HTTP-request header fields should have.
				<br>These values are randomly generated according to the parameters below`,
				suffix: 'enable modifications',
				addDefault: true,
				type: 'bool',
				expanded: false,
				children: [
					({
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
						suffix: 'weeks',
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
						suffix: 'years',
						restrict: { from: 0, to: 11, type: 'number', },
						addDefault: { from: 0, to: 3, },
						type: 'interval',
					}), optional({
						name: 'dntChance',
						title: 'Do-Not-Track header',
						description: `If you would trust the <a href="https://en.wikipedia.org/wiki/Do_Not_Track">Do Not Track</a> concept, you wouldn't be using this extension.
						<br>So the best use for it is probably to send random values`,
						prefix: 'Chance to set the header:',
						infix: '% &emsp;&emsp;&emsp; Chance to opt in to tracking:',
						suffix: '%',
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
			}), optional({
				name: 'plugins',
				title: 'Plugins',
				description: `By default scripts can enumerate the plugins installed on your OS / in your browser`,
				suffix: 'enable modifications',
				addDefault: true,
				type: 'bool',
				expanded: false,
				children: [
					optional({
						name: 'hideAll',
						title: 'Hide all',
						description: `Makes the browser report that there are no plugins installed. If a website decides to load a plugin anyway, that plugin will still work. It is not disabled, just hidden from enumeration`,
						addDefault: true,
						type: 'bool',
					}),
				]
			}), optional({
				name: 'devices',
				title: 'Media Devices',
				description: `By default scripts can detect the audio/video input hardware of your computer`,
				suffix: 'enable modifications',
				addDefault: true,
				type: 'bool',
				expanded: false,
				children: [
					optional({
						name: 'hideAll',
						title: 'Hide all',
						description: `Makes the browser report that there are no media devices available`,
						addDefault: true,
						type: 'bool',
					}),
				]
			}), optional({
				name: 'windowName',
				title: 'Reset window.name',
				description: `If checked, the window.name property gets reset at every load`,
				addDefault: true,
				type: 'bool',
				expanded: false,
			}), optional({
				name: 'screen',
				title: 'Screen',
				description: `Decide which values the window.screen and and window.devicePixelRatio should have.
				<br>These values are randomly generated according to the parameters below`,
				suffix: 'enable modifications',
				addDefault: true,
				type: 'bool',
				expanded: false,
				children: [
					optional({
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
						suffix: 'pixels',
						type: 'interval',
					}), optional({
						name: 'height',
						title: 'screen.height',
						addDefault: { from: 768, to: 2160, },
						restrict: { from: 600, to: 8192, type: 'number', },
						suffix: 'pixels',
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
						default: true,
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
			}), optional({
				name: 'fonts',
				title: 'Fonts',
				description: `The set of fonts installed on a computer can be quite unique.
				<br>There are simple ways to detect these fonts:
				<ul>
					<li>Plugins like flash allow to list the fonts directly</li>
					<li>JavaScript can test the presence of a font by displaying (hidden) text in that font and checking how it is rendered</li>
				</ul>
				`,
				suffix: 'enable modifications',
				addDefault: true,
				type: 'bool',
				expanded: false,
				children: [
					optional({
						name: 'dispersion',
						title: 'JavaScript randomness',
						description: `To prevent JavaScript from detecting fonts, this adds some randomness to the size of text elements.
						<br>On most websites this should not have any visible effects, but the font detection will effectively disabled if the randomness is greater zero`,
						suffix: '%',
						addDefault: 25,
						restrict: { from: 0, to: 75, },
						type: 'number',
					}),
				],
			}), optional({
				name: 'canvas',
				title: 'Canvas',
				description: `<pre>
Websites are able to draw custom images on special &lt;canvas&gt; elements.
Since different browsers on different operation systems on different hardware draw a little different on different screens, reading these images allows for browser fingerprinting
</pre>`,
				suffix: 'enable modifications',
				addDefault: true,
				type: 'bool',
				expanded: false,
				children: [
					({
						name: 'randomize',
						title: 'Randomize',
						description: `<pre>
Currently the only technique to disable canvas fingerprinting is to add random noise to &lt;canvas&gt; images when they are read.
You can't configure anything about that yet
</pre>`,
						type: 'label',
						default: true,
					}),
				],
			}),
		],
	}, {
		name: 'manage',
		title: 'Manage profile',
		default: [ 'delete', ],
		type: 'control',
	},
]);

const listerners = new WeakMap;

return deepFreeze(Object.assign(id => new Options({
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
}), { defaults, defaultRules: {
	'disabled': [ false, ],
	'logLevel': [ 3, ],
	'lifetime': [ 'page', ],
	'hstsDisabled': [ true, ],
	'navigator': [ true, ],
	'navigator.browser': [ applications.current, ],
	'navigator.browserAge': [ { from: -1, to: 12, }, ],
	'navigator.os': [ 'win', 'mac', 'lin', ],
	'navigator.osArch': [ '32_32', '32_64', '64_64', ],
	'navigator.cpuCores': [ { from: 1, to: 32, }, ],
	'navigator.osAge': [ { from: 0, to: 3, }, ],
	'navigator.dntChance': [ { from: 30, to: 1, }, ],
	'navigator.ieFeatureCount': [ { from: 0, to: 3, }, ],
	'navigator.ieFeatureExclude': [ ],
	'plugins': [ true, ],
	'plugins.hideAll': [ true, ],
	'devices': [ true, ],
	'devices.hideAll': [ true, ],
	'windowName': [ true, ],
	'screen': [ true, ],
	'screen.devicePixelRatio': [ { from: 1, to: window.devicePixelRatio * 1.25, }, ],
	'screen.width': [  { from: screen.width * 0.8, to: 3840, }, ],
	'screen.height': [  { from: screen.height * 0.8, to: 2160, }, ],
	'screen.ratio': [ { from: 0, to: 100, }, ],
	'screen.offset': [ true, ],
	'screen.offset.top': [ { from: 0, to: 0, }, ],
	'screen.offset.right': [ { from: 0, to: 0, }, ],
	'screen.offset.bottom': [ { from: 30, to: 50, }, ],
	'screen.offset.left': [ { from: 0, to: 0, }, ],
	'fonts': [ true, ],
	'fonts.dispersion': [ 25, ],
	'canvas': [ true, ],
	'canvas.randomize': [ true, ],
}, }));




});
