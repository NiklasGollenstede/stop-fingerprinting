(function() { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/object': { copyProperties, deepFreeze, },
	'node_modules/regexpx/': RegExpX,
	'node_modules/web-ext-utils/options/': Options,
	'node_modules/web-ext-utils/chrome/': { Storage, applications, },
	utils: { DOMAIN_CHARS, },
}) {

let makeModel = (optional, _default) => ({
	title: {
		title: 'Profile name',
		default: 'New Profile',
		type: 'string',
	},
	description: {
		title: 'Description',
		type: 'text',
		default: '',
		placeholder: `You can save notes about this profile here`,
		expanded: false,
	},
	include: {
		title: 'Included hosts',
		description: `
This profile only apples to websites matching any of the hosts below.

A domain may contain one or more <code>*</code>'s as wildcards.
The meaning of that wildcard depends on its position:<ul>
<li> after a <code>.</code> at the end, it means any <a href="https://en.wikipedia.org/wiki/Top-level_domain">Top Level Domain</a>, such as <code>.com</code>, <code>.co.uk</code> or <code>.blogspot.co.at</code>. </li>
<li> in between two <code>.</code>'s, it means any name that doesn't contain a <code>.</code> itself, such as <code>google</code> or <code>amazon</code>. </li>
<li> at the beginning before a <code>.</code>, it means any sub domain, such as <code>www.</code>, <code>mail.</code>, <code>code.</code> or <code>any.thing.else.</code> e.g. before <code>google.com</code>. </li>
</ul>
You can ether specify one domain per row, or multiple hosts in one row divided by <code>|</code>es.
If you put multiple hosts in one row, they are seen as equivalent by this add-on. That is, they for example share the same session.
`, // TODO: allow scheme://domain:port
		maxLength: Infinity,
		addDefault: String.raw`*.domain.com | www.domain.co.uk | *.*.berlin`,
		restrict: {
			match: {
				exp: RegExpX`^(?! \s* \| \s* ) (?:
					(?: ^ | \s* \| \s* )      # ' | ' separated list of:
					(?:                                # '<sub>.<name>.<tld>':
						  (?:
							   \* \. |(?:    ${ DOMAIN_CHARS }+ \.)*      # '*.' or a '.' terminated list of sub domain names
						) (?:
							   \*    |       ${ DOMAIN_CHARS }+           # '*' or a domain name
						) (?:
							\. \*    |(?: \. ${ DOMAIN_CHARS }+   )*      # '.*' or '.'+ TLD
						)
					)
				)+$`,
				message: `Each line must be a '|' separated list of domains (<sub>.<name>.<tld>)`,
			},
			unique: '.',
		},
		type: 'string',
	},
	priority: {
		title: 'Profile priority',
		description: `If a website is matched by the include rules of more than one Profile, the profile with the highest priority is used.`,
		default: 0,
		restrict: { from: -Infinity, to: Infinity, },
		type: 'number',
		expanded: false,
	},
	inherits: {
		title: 'Inherited Profile',
		description: `<pre>
You don't have to specify all possible parameters for a website in a single profile.
'Rules' that are not specified in this Profile are inherited from:
</pre>`,
		default: '<default>',
		type: 'string', // TODO: this shouldn't be a string input
		expanded: false,
	},
	rules: {
		title: 'Rules',
		description: 'Set the rules that should apply to all matching sites, any rules that are not set will be filled in by matching profiles with lower priorities or the extensions default values',
		type: 'label',
		default: true,
		children: {
			disabled: optional({
				title: 'Disable',
				description: 'Completely disable this extension for all matching sites',
				[_default]: false,
				type: 'bool',
			}),
			logLevel: optional({
				title: 'Logging',
				description: 'Decide what priority of notifications you want to see',
				[_default]: 3,
				type: 'menulist',
				options: [
					{ value: 1, label: `Include debugging`, },
					{ value: 2, label: `Log everything`, },
					{ value: 3, label: `Important only`, },
					{ value: 4, label: `Errors only`, },
				],
			}),
			session: optional({
				title: 'Session duration',
				description: `This extension will generate a new random environment for every session and every domain / domain group.
				<br>Here you can choose the scope and duration of those sessions.
				<br>You can also end the current session from the pop-up menu.`, // TODO: implement this
				[_default]: 'page',
				type: 'menulist',
				options: [
					{ value: 'browser',  label: `Browser: All tabs use the same session, the session lasts until the browser is closed`, }, // TODO: (separate for private/incognito // mode)
					// { value: 'window',   label: `Window: Once per window. You should reload tabs if you move them between windows`, },
					{ value: 'tab',      label: `Tab: Every tab gets its own session, the session ends when the tab gets closed`, },
					{ value: 'page',      label: `Page: Every page in every tab gets its own session, the session ends when th tab is reloaded`, },
				],
			}),
			hstsDisabled: optional({
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
				[_default]: true,
				type: 'bool',
				expanded: false,
			}),
			navigator: optional({
				title: 'Navigator and Requests',
				description: `Decide which values the window.navigator and some HTTP-request header fields should have.
				<br>These values are randomly generated according to the parameters below`,
				suffix: 'enable modifications',
				[_default]: true,
				type: 'bool',
				expanded: false,
				children: {
					browser: optional({
						title: 'Browsers',
						description: 'The browsers that can be chosen from',
						type: 'menulist',
						[_default]: applications.current,
						minLength: 1,
						maxLength: 3,
						restrict: { unique: '.', },
						options: [
							{ value: 'chrome',  label: 'Chrome', },
							{ value: 'firefox', label: 'Firefox', },
							{ value: 'ie',      label: 'Internet Explorer / Edge', },
						],
					}),
					browserAge: optional({
						title: 'Browser Age',
						description: 'The age of the browser version, chose negative values to allow beta versions',
						suffix: 'weeks',
						restrict: { from: -10, to: 150, type: 'number', },
						[_default]: { from: -1, to: 12, },
						type: 'interval',
					}),
					os: optional({
						title: 'Operating Systems',
						description: 'The operating systems that can be chosen from',
						type: 'menulist',
						[_default]: [ 'win', 'mac', 'lin', ],
						addDefault: 'win',
						minLength: 1,
						maxLength: 3,
						restrict: { unique: '.', },
						options: [
							{ value: 'win', label: 'Windows', },
							{ value: 'mac', label: 'Mac OS', },
							{ value: 'lin', label: 'Linux', },
						],
					}),
					osArch: ({
						title: 'Processor Architecture',
						description: 'The processor and process architectures that can be chosen from',
						type: 'menulist',
						[_default]: [ '32_32', '32_64', '64_64', ],
						addDefault: '32_32',
						maxLength: 3,
						restrict: { unique: '.', },
						options: [
							{ value: '32_32', label: '32 bit', },
							{ value: '32_64', label: '32 on 64 bit', },
							{ value: '64_64', label: '64 bit', },
						],
					}),
					cpuCores: optional({
						title: 'CPU cores',
						description: 'Number of (virtual) CPU cores',
						restrict: { from: 1, to: 16, type: 'number', },
						[_default]: { from: 1, to: 8, },
						type: 'interval',
					}),
					osAge: optional({
						title: 'Operating Systems Age',
						description: 'The age of the operating system version',
						suffix: 'years',
						restrict: { from: 0, to: 11, type: 'number', },
						[_default]: { from: 0, to: 3, },
						type: 'interval',
					}),
					dntChance: optional({
						title: 'Do-Not-Track header',
						description: `If you would trust the <a href="https://en.wikipedia.org/wiki/Do_Not_Track">Do Not Track</a> concept, you wouldn't be using this extension.
						<br>So the best use for it is probably to send random values`,
						prefix: 'Chance to set the header:',
						infix: '% &emsp;&emsp;&emsp; Chance to opt in to tracking:',
						suffix: '%',
						[_default]: { from: 30, to: 1, },
						restrict: { from: 0, to: 100, type: 'number', },
						type: 'interval',
					}),
					ieFeatureCount: optional({
						title: 'Number of Internet Explorer "features"',
						description: `This is rather a detail and only applies if an Internet Explorer User Agent is generated.
						<br>The IE User Agent contains things like the installed versions on .NET and others. This option restricts the number of these "features"`,
						restrict: { from: 0, to: 7, type: 'number', },
						[_default]: { from: 0, to: 4, },
						type: 'interval',
					}),
					ieFeatureExclude: optional({
						title: 'Exclude Internet Explorer "features"',
						description: `Any feature strings partially matched by the regular expression below will be excluded`,
						[_default]: [ ],
						addDefault: '(?!)',
						restrict: { isRegExp: true, },
						type: 'string',
					}),
				},
			}),
			plugins: optional({
				title: 'Plugins',
				description: `By default scripts can enumerate the plugins installed on your OS / in your browser`,
				suffix: 'enable modifications',
				[_default]: true,
				type: 'bool',
				expanded: false,
				children: {
					hideAll: optional({
						title: 'Hide all',
						description: `Makes the browser report that there are no plugins installed. If a website decides to load a plugin anyway, that plugin will still work. It is not disabled, just hidden from enumeration`,
						[_default]: true,
						type: 'bool',
					}),
				},
			}),
			devices: optional({
				title: 'Media Devices',
				description: `By default scripts can detect the audio/video input hardware of your computer`,
				suffix: 'enable modifications',
				[_default]: true,
				type: 'bool',
				expanded: false,
				children: {
					hideAll: optional({
						title: 'Hide all',
						description: `Makes the browser report that there are no media devices available`,
						[_default]: true,
						type: 'bool',
					}),
				}
			}),
			windowName: optional({
				title: 'Reset window.name',
				description: `If checked, the window.name property gets reset at every load`,
				[_default]: true,
				type: 'bool',
				expanded: false,
			}),
			screen: optional({
				title: 'Screen',
				description: `Decide which values the window.screen and and window.devicePixelRatio should have.
				<br>These values are randomly generated according to the parameters below`,
				suffix: 'enable modifications',
				[_default]: true,
				type: 'bool',
				expanded: false,
				children: {
					devicePixelRatio: optional({
						title: 'devicePixelRatio',
						[_default]: { from: 1, to: 1.5, },
						restrict: { from: 0.5, to: 8, type: 'number', },
						type: 'interval',
					}),
					width: optional({
						title: 'screen.width',
						[_default]: { from: screen.width * 0.8, to: 3840, },
						restrict: { from: 1024, to: 8192, type: 'number', },
						suffix: 'pixels',
						type: 'interval',
					}),
					height: optional({
						title: 'screen.height',
						[_default]: { from: screen.height * 0.8, to: 2160, },
						restrict: { from: 600, to: 8192, type: 'number', },
						suffix: 'pixels',
						type: 'interval',
					}),
					ratio: optional({
						title: 'Aspect ratio',
						description: 'The quotient screen.width / screen.height',
						[_default]: { from: 1.3, to: 2.4, },
						restrict: { from: 0.5, to: 8, type: 'number', },
						type: 'interval',
					}),
					offset: {
						title: 'Offset',
						description: 'The amount of space at each edge of the screen that is occupied by task/title bars etc.',
						type: 'label',
						default: true,
						children: {
							top: optional({
								title: 'Top',
								[_default]: { from: 0, to: 0, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}),
							right: optional({
								title: 'Right',
								[_default]: { from: 0, to: 0, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}),
							bottom: optional({
								title: 'Bottom',
								[_default]: { from: 30, to: 50, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}),
							left: optional({
								title: 'Left',
								[_default]: { from: 0, to: 0, },
								restrict: { from: 0, to: 200, type: 'number', },
								type: 'interval',
							}),
						},
					},
				},
			}),
			fonts: optional({
				title: 'Fonts',
				description: `The set of fonts installed on a computer can be quite unique.
				<br>There are simple ways to detect these fonts:
				<ul>
					<li>Plugins like flash allow to list the fonts directly</li>
					<li>JavaScript can test the presence of a font by displaying (hidden) text in that font and checking how it is rendered</li>
				</ul>
				`,
				suffix: 'enable modifications',
				[_default]: true,
				type: 'bool',
				expanded: false,
				children: {
					dispersion: optional({
						title: 'JavaScript randomness',
						description: `To prevent JavaScript from detecting fonts, this adds some randomness to the size of text elements.
						<br>On most websites this should not have any visible effects, but the font detection will effectively disabled if the randomness is greater zero`,
						suffix: '%',
						[_default]: 25,
						restrict: { from: 0, to: 75, },
						type: 'number',
					}),
				},
			}),
			canvas: optional({
				title: 'Canvas',
				description: `<pre>
Websites are able to draw custom images on special &lt;canvas&gt; elements.
Since different browsers on different operation systems on different hardware draw a little different on different screens, reading these images allows for browser fingerprinting
</pre>`,
				suffix: 'enable modifications',
				[_default]: true,
				type: 'bool',
				expanded: false,
				children: {
					randomize: ({
						title: 'Randomize',
						description: `<pre>
Currently the only technique to disable canvas fingerprinting is to add random noise to &lt;canvas&gt; images when they are read.
You can't configure anything about that yet
</pre>`,
						type: 'label',
						default: true,
					}),
				},
			}),
		},
	},
	manage: {
		title: 'Manage profile',
		default: [ 'delete', ],
		type: 'control',
	},
});

const model = makeModel(option => Object.assign(option, { minLength: 0, }), 'addDefault');

const listerners = new WeakMap;
const createProfile = (id, model) => {
	const prefix = 'profile.'+ id;
	return new Options({
		model: Object.assign(model, { id: {
			default: id,
			restrict: { readOnly: true, },
			type: 'hidden',
		}, }),
		prefix,
		storage: Storage.sync || Storage.local,
		addChangeListener(listener) {
			const onChanged = changes => {
				Object.keys(changes).forEach(key => key.startsWith(prefix) && listener(key, changes[key].newValue));
			};
			listerners.set(listener, onChanged);
			Storage.onChanged.addListener(onChanged);
		},
		removeChangeListener(listener) {
			const onChanged = listerners.get(listener);
			listerners.delete(listener);
			Storage.onChanged.removeListener(onChanged);
		},
	});
};

const defaultProfile = (yield createProfile('<default>', copyProperties(makeModel(_=>_, 'default'), {
	title: {
		default: '<default>',
	},
	description: {
		expanded: null,
		type:  'label',
		description: `TODO`,
	},
	include: {
		expanded: null,
		type: 'label',
		description: `TODO`,
		maxLength: 0,
	},
	priority: {
		default: -Infinity,
		expanded: null,
		disabled: true,
		type: 'string',
	},
	inherits: {
		default: null,
		expanded: null,
		type: 'label',
		description: `TODO`,
	},
	// rules: ,
	manage: {
		type: 'hidden',
	},
})));

function Profile(id) {
	return id === '<default>' ? defaultProfile : createProfile(id, model);
}

return deepFreeze(Object.assign(Profile, { defaultProfile, model, }));

}); })();
