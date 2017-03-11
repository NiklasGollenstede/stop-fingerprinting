(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/object': { copyProperties, },
	'node_modules/regexpx/': RegExpX,
	'node_modules/web-ext-utils/options/': Options,
	'node_modules/web-ext-utils/browser/version': applications,
	utils: { DOMAIN_CHARS, },
}) => {

const makeModel = (optional, _default) => ({
	title: {
		title: 'Profile name',
		default: 'New Profile',
		input: { type: 'string', },
	},
	description: {
		title: 'Description',
		default: '',
		expanded: false,
		input: { type: 'text', placeholder: `You can save notes about this profile here`, },
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
		input: { type: 'string', },
	},
	priority: {
		title: 'Profile priority',
		description: `If a website is matched by the include rules of more than one Profile, the profile with the highest priority is used.`,
		default: 0,
		restrict: { from: -Infinity, to: Infinity, },
		expanded: false,
		input: { type: 'number', },
	},
	inherits: {
		title: 'Inherited Profile',
		description: `You don't have to specify all possible parameters for a website in a single profile.
		<br>'Rules' that are not specified in this Profile are inherited from:`,
		default: '<default>',
		expanded: false,
		input: { type: 'string', }, // TODO: this shouldn't be a string input
	},
	rules: {
		title: 'Rules',
		description: `Set the rules that should apply to all matching sites, any rules that are not set will be filled in by matching profiles with lower priorities or the extensions default values`,
		default: true,
		input: { type: 'label', },
		children: {
			disabled: optional({
				title: 'Disable',
				description: `Completely disable this extension for all matching sites`,
				[_default]: false,
				input: { type: 'bool', },
			}),
			logLevel: optional({
				title: 'Logging',
				description: `Decide what priority of notifications you want to see`,
				[_default]: 3,
				input: { type: 'menulist', options: [
					{ value: 1, label: `Include debugging`, },
					{ value: 2, label: `Log everything`, },
					{ value: 3, label: `Important only`, },
					{ value: 4, label: `Errors only`, },
				], },
			}),
			session: optional({
				title: 'Session duration',
				description: `This extension will generate a new random environment for every session and every domain / domain group.
				<br>Here you can choose the scope and duration of those sessions.
				<br>You can also end the current session from the pop-up menu.`, // TODO: implement this
				[_default]: 'page',
				input: { type: 'menulist', options: [
					{ value: 'browser',  label: `Browser: All tabs use the same session, the session lasts until the browser is closed`, }, // TODO: (separate for private/incognito // mode)
					// { value: 'window',   label: `Window: Once per window. You should reload tabs if you move them between windows`, },
					{ value: 'tab',      label: `Tab: Every tab gets its own session, the session ends when the tab gets closed`, },
					{ value: 'page',      label: `Page: Every page in every tab gets its own session, the session ends when th tab is reloaded`, },
				], },
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
				expanded: false,
				input: { type: 'bool', },
			}),
			navigator: optional({
				title: 'Navigator and Requests',
				description: `Decide which values the window.navigator and some HTTP-request header fields should have.
				<br>These values are randomly generated according to the parameters below`,
				[_default]: true,
				expanded: false,
				input: { type: 'bool', suffix: 'enable modifications', },
				children: {
					browser: optional({
						title: 'Browsers',
						description: `The browsers that can be chosen from`,
						[_default]: applications.current,
						restrict: { unique: '.', },
						minLength: 1,
						maxLength: 3,
						input: { type: 'menulist', options: [
							{ value: 'chrome',  label: 'Chrome', },
							{ value: 'firefox', label: 'Firefox', },
							{ value: 'ie',      label: 'Internet Explorer / Edge', },
						], },
					}),
					browserAge: optional({
						title: 'Browser Age',
						description: `The age of the browser version, chose negative values to allow beta versions`,
						[_default]: [ [ -1, 12, ], ],
						restrict: [ { from: -10, to: 150, type: 'number', }, { from: -10, to: 150, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'weeks.', }, ],
					}),
					os: optional({
						title: 'Operating Systems',
						description: `The operating systems that can be chosen from`,
						[_default]: [ 'win', 'mac', 'lin', ],
						restrict: { unique: '.', },
						addDefault: 'win',
						minLength: 1,
						maxLength: 3,
						input: { type: 'menulist', options: [
							{ value: 'win', label: 'Windows', },
							{ value: 'mac', label: 'Mac OS', },
							{ value: 'lin', label: 'Linux', },
						], },
					}),
					osArch: ({
						title: 'Processor Architecture',
						description: `The processor and process architectures that can be chosen from`,
						[_default]: [ '32_32', '32_64', '64_64', ],
						restrict: { unique: '.', },
						addDefault: '32_32',
						maxLength: 3,
						input: { type: 'menulist', options: [
							{ value: '32_32', label: '32 bit', },
							{ value: '32_64', label: '32 on 64 bit', },
							{ value: '64_64', label: '64 bit', },
						], },
					}),
					cpuCores: optional({
						title: 'CPU cores',
						description: `Number of (virtual) CPU cores`,
						[_default]: [ [ 1, 8, ], ],
						restrict: [ { from: 1, to: 16, type: 'number', }, { from: 1, to: 16, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: '.', }, ],
					}),
					osAge: optional({
						title: 'Operating Systems Age',
						description: `The age of the operating system version`,
						[_default]: [ [ 0, 3, ], ],
						restrict: [ { from: 0, to: 11, type: 'number', }, { from: 0, to: 11, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'years.', }, ],
					}),
					dntChance: optional({
						title: 'Do-Not-Track header',
						description: `If you would trust the <a href="https://en.wikipedia.org/wiki/Do_Not_Track">Do Not Track</a> concept, you wouldn't be using this extension.
						<br>So the best use for it is probably to send random values`,
						[_default]: [ [ 30, 1, ], ],
						restrict: [ { from: 0, to: 100, type: 'number', }, { from: 0, to: 100, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'Chance to set the header', suffix: '%.', }, { type: 'integer', prefix: 'Chance to opt in to tracking', suffix: '%.', }, ],
					}),
					ieFeatureCount: optional({
						title: 'Number of Internet Explorer "features"',
						description: `This is rather a detail and only applies if an Internet Explorer User Agent is generated.
						<br>The IE User Agent contains things like the installed versions on .NET and others. This option restricts the number of these "features"`,
						[_default]: [ [ 0, 4, ], ],
						restrict: [ { from: 0, to: 7, type: 'number', }, { from: 0, to: 7, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: '.', }, ],
					}),
					ieFeatureExclude: optional({
						title: 'Exclude Internet Explorer "features"',
						description: `Any feature strings partially matched by the regular expression below will be excluded`,
						[_default]: [ ],
						addDefault: '(?!)',
						restrict: { isRegExp: true, },
						input: { type: 'string', },
					}),
				},
			}),
			plugins: optional({
				title: 'Plugins',
				description: `By default scripts can enumerate the plugins installed on your OS / in your browser`,
				[_default]: true,
				expanded: false,
				input: { type: 'bool', suffix: 'enable modifications', },
				children: {
					hideAll: optional({
						title: 'Hide all',
						description: `Makes the browser report that there are no plugins installed. If a website decides to load a plugin anyway, that plugin will still work. It is not disabled, just hidden from enumeration`,
						[_default]: true,
						input: { type: 'bool', },
					}),
				},
			}),
			devices: optional({
				title: 'Media Devices',
				description: `By default scripts can detect the audio/video input hardware of your computer`,
				[_default]: true,
				expanded: false,
				input: { type: 'bool', suffix: 'enable modifications', },
				children: {
					hideAll: optional({
						title: 'Hide all',
						description: `Makes the browser report that there are no media devices available`,
						[_default]: true,
						input: { type: 'bool', },
					}),
				},
			}),
			windowName: optional({
				title: 'Reset window.name',
				description: `If checked, the window.name property gets reset at every load`,
				[_default]: true,
				expanded: false,
				input: { type: 'bool', },
			}),
			screen: optional({
				title: 'Screen',
				description: `Decide which values the window.screen and and window.devicePixelRatio should have.
				<br>These values are randomly generated according to the parameters below`,
				[_default]: true,
				expanded: false,
				input: { type: 'bool', suffix: 'enable modifications', },
				children: {
					devicePixelRatio: optional({
						title: 'devicePixelRatio',
						[_default]: [ [ 1, 1.5, ], ],
						restrict: [ { from: 0.5, to: 8, type: 'number', }, { from: 0.5, to: 8, type: 'number', }, ],
						input: [ { type: 'number', prefix: 'From', }, { type: 'number', prefix: 'to', suffix: '.', }, ],
					}),
					width: optional({
						title: 'screen.width',
						[_default]: [ [ global.screen.width / global.devicePixelRatio * 0.8, 3840, ], ],
						restrict: [ { from: 1024, to: 8192, type: 'number', }, { from: 1024, to: 8192, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'pixels.', }, ],
					}),
					height: optional({
						title: 'screen.height',
						[_default]: [ [ global.screen.height / global.devicePixelRatio * 0.8, 2160, ], ],
						restrict: [ { from: 600, to: 8192, type: 'number', }, { from: 600, to: 8192, type: 'number', }, ],
						input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'pixels.', }, ],
					}),
					ratio: optional({
						title: 'Aspect ratio',
						description: `The quotient screen.width / screen.height`,
						[_default]: [ [ 1.3, 2.4, ], ],
						restrict: [ { from: 0.5, to: 8, type: 'number', }, { from: 0.5, to: 8, type: 'number', }, ],
						input: [ { type: 'number', prefix: 'From', }, { type: 'number', prefix: 'to', suffix: '.', }, ],
					}),
					offset: {
						title: 'Offset',
						description: `The amount of space at each edge of the screen that is occupied by task/title bars etc.`,
						default: true,
						input: { type: 'label', },
						children: {
							top: optional({
								title: 'Top',
								[_default]: [ [ 0, 0, ], ],
								restrict: [ { from: 0, to: 200, type: 'number', }, { from: 0, to: 200, type: 'number', }, ],
								input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'px.', }, ],
							}),
							right: optional({
								title: 'Right',
								[_default]: [ [ 0, 0, ], ],
								restrict: [ { from: 0, to: 200, type: 'number', }, { from: 0, to: 200, type: 'number', }, ],
								input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'px.', }, ],
							}),
							bottom: optional({
								title: 'Bottom',
								[_default]: [ [ 30, 50, ], ],
								restrict: [ { from: 0, to: 200, type: 'number', }, { from: 0, to: 200, type: 'number', }, ],
								input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'px.', }, ],
							}),
							left: optional({
								title: 'Left',
								[_default]: [ [ 0, 0, ], ],
								restrict: [ { from: 0, to: 200, type: 'number', }, { from: 0, to: 200, type: 'number', }, ],
								input: [ { type: 'integer', prefix: 'From', }, { type: 'integer', prefix: 'to', suffix: 'px.', }, ],
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
				[_default]: true,
				expanded: false,
				input: { type: 'bool', suffix: 'enable modifications', },
				children: {
					dispersion: optional({
						title: 'JavaScript randomness',
						description: `To prevent JavaScript from detecting fonts, this adds some randomness to the size of text elements.
						<br>On most websites this should not have any visible effects, but the font detection will effectively disabled if the randomness is greater zero.`,
						[_default]: 25,
						restrict: { from: 0, to: 75, },
						input: { type: 'number', suffix: '%', },
					}),
				},
			}),
			canvas: optional({
				title: 'Canvas',
				description: `Websites are able to draw custom images on special &lt;canvas&gt; elements.
				<br>Since different browsers on different operation systems on different hardware draw a little different on different screens,
				reading these images allows for browser fingerprinting.`,
				[_default]: true,
				expanded: false,
				input: { type: 'bool', suffix: 'enable modifications', },
				children: {
					randomize: ({
						title: 'Randomize',
						description: `Currently the only technique to disable canvas fingerprinting is to add random noise to &lt;canvas&gt; images when they are read.
						<br>You can't configure anything about that yet.`,
						default: true,
					}),
				},
			}),
		},
	},
	manage: {
		title: 'Manage profile',
		default: true,
		input: { type: 'control', id: 'delete', label: 'Delete', },
	},
});

const model = makeModel(option => Object.assign(option, { minLength: 0, }), 'addDefault');

const createProfile = (id, model) => new Options({ model: Object.assign({ id: {
	default: id,
	restrict: { readOnly: true, },
	hidden: true,
}, }, model), prefix: 'profile.'+ id, });

const defaultProfile = (await createProfile('<default>', copyProperties(makeModel(_=>_, 'default'), {
	title: {
		default: '<default>',
	},
	description: {
		expanded: null,
		input: { type:  'label', },
		description: `TODO`,
	},
	include: {
		expanded: null,
		input: { type: 'label', },
		description: `TODO`,
		maxLength: 0,
	},
	priority: {
		default: -Infinity,
		expanded: null,
		disabled: true,
		input: { type: 'string', },
	},
	inherits: {
		default: null,
		expanded: null,
		input: { type: 'label', },
		description: `TODO`,
	},
	// rules: ,
	manage: {
		hidden: true,
	},
})));

function Profile(id) {
	return id === '<default>' ? defaultProfile : createProfile(id, model);
}

return Object.assign(Profile, { defaultProfile, model, });

}); })(this);
