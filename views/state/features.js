(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	exports,
}) => {

exports.featureStates = {
	stable:        { color: 100, /*hsl(100, 100%, 25%)*/ title: `stable`,       description: `Implemented and seems to work`, },
	implemented:   { color: 212, /*hsl(212, 100%, 25%)*/ title: `implemented`,  description: `Implemented and not known to not work`, },
	almost:        { color: 200, /*hsl(195, 100%, 25%)*/ title: `almost`,       description: `Implemented and seems to work, but there is room for improvement`, },
	partial:       { color:  60, /*hsl( 60, 100%, 25%)*/ title: `partial`,      description: `Smoe parts of this feature have been implemented`, },
	experimental:  { color:  39, /*hsl( 39, 100%, 25%)*/ title: `experimental`, description: `At least partially implemented, but not sufficiently tested at all`, },
	noApi:         { color: 270, /*hsl(270, 100%, 25%)*/ title: `API missing`,  description: `This browser doesn't support the API to implement this feature`, },
	missing:       { color:  10, /*hsl( 10, 100%, 25%)*/ title: `missing`,      description: `Not implemented at all, but should be added in the future`, },
};

exports.features = {
	ui: {
		title: `User Interface`,
		entries: {
			options: {
				title: `Options`,
				description: `Have options for all features configurable per tab and or url (pattern)`,
				state: {
					all: { stable: `The current configuration system may be to complex for most users`, },
				},
			},
			temp: {
				title: `Temporary Options`,
				description: `Allow for temporary overwrites of options`,
				state: {
					all: { stable: ``, },
				},
			},
			notifications: {
				title: `Notifications`,
				description: `Optionally show notifications for all relevant events`,
				state: {
					all: { partial: `There are only notifications for a few things, they can be suppressed according to their priority`, },
				},
			},
		},
	},
	network: {
		title: `Network`,
		entries: {
			hsts: {
				title: `Disable HSTS`,
				description: `Make HSTS fingerprinting impossible`,
				state: {
					chrome: { stable: ``, },
					firefox: { noApi: `Firefox seems to read the HSTS headers before this extension can modify them`, },
				},
			},
			cache: {
				title: `Disable caching`,
				description: `Disable caching`,
				state: {
					chrome: { stable: `The cache is not actually disabled but cleared frequently`, },
					firefox: { noApi: `Can be disabled in 'about:config', but a web extension can't access that (yet?)`, },
				},
			},
			headers: {
				title: `HTTP headers`,
				description: `Generate and order <i>all</i> HTTP headers according to the current User Agent`,
				state: {
					chrome: { partial: `Chrome ignores the order of the header fields. Only en-US is supported as Accept.Language`, },
					firefox: { stable: `Only en-US is supported as Accept.Language`, },
				},
			},
		},
	},
	content: {
		title: `JavaScript environment`,
		entries: {
			frames: {
				title: `iframes`,
				description: `Attach to all possible frames/iframes/etc.`,
				state: {
					all: { implemented: `There are many, many ways to include iframes (cross origin, sandboxing, ...)`, },
				},
			},
			csp: {
				title: `Keep CSP`,
				description: `To be able to inject into all sites the security feature CSP has to be partially disabled and then reimplemented for the content website`,
				state: {
					all: { implemented: `If this doesn't work it may create security problems`, },
				},
			},
			workers: {
				title: `Web Workers`,
				description: `Attach to Workers and SharedWorkers`,
				state: {
					all: { experimental: `There is no API to do this and the work around is rather complicated and may break stuff`, },
				},
			},
			serviceWorkers: {
				title: `Service Workers`,
				description: `Handle Service Workers`,
				state: {
					all: { missing: ``, },
				},
			},
			navigator: {
				title: `User Agent / window.navigator`,
				description: `Generate random but realistic User Agents and corresponding window.navigator properties`,
				state: {
					all: { almost: `navigator.language is not implemented`, },
				},
			},
			screen: {
				title: `Screen`,
				description: `Generate random but realistic window.screen values (which represent the monitor hardware)`,
				state: {
					all: { stable: `window.inner/outerWidth/Height still leak browser layout info, the DPR can be detected e.g. via CSS`, },
				},
			},
			plugins: {
				title: `Plugins`,
				description: `Hide the installed plugins from JavaScript enumeration`,
				state: {
					all: { stable: `Note that this only <b>hides</b> the plugins, they can still be loaded`, },
				},
			},
			beacon: {
				title: `sendBeacon`,
				description: `Disable navigator.sendBeacon and hyperlink auditing`,
				state: {
					all: { almost: `Hyperlink auditing has to be disabled separately`, },
				},
			},
			fonts: {
				title: `Font enumeration`,
				description: `Prevent font enumeration`,
				state: {
					all: { experimental: `Currently only adds randomness to element sizes. This can cause websites to misbehave and fonts can still be detected if the attacker is clever`, },
				},
			},
			canvas2d: {
				title: `2D &lt;canvas&gt;`,
				description: `Make 2D &lt;canvas&gt; fingerprinting useless by distorting the image on reads`,
				state: {
					all: { almost: `Currently adds ugly random noise`, },
				},
			},
			canvasWebGL: {
				title: `WebGL &lt;canvas&gt;`,
				description: `Make WebGL &lt;canvas&gt; fingerprinting useless by distorting the image on reads`,
				state: {
					all: { partial: `Only adds noise if the entire canvas is converted to an URL`, },
				},
			},
			webGlFeatures: {
				title: `WebGL APIs`,
				description: `Prevent the WebGL APIs from leaking information about the system and its hardware`,
				state: {
					all: { missing: ``, },
				},
			},
			audioContext: {
				title: `AudioContext`,
				description: `Prevent AudioContext fingerprinting`,
				state: {
					all: { missing: ``, },
				},
			},
			WebRTC: {
				title: `WebRTC local IP`,
				description: `Prevent WebRTC local IP detection on a per-tab basis`,
				state: {
					all: { missing: `Can be globally disabled in 'about:config' or with other extensions`, },
				},
			},
			mediaDevices: {
				title: `Media Device`,
				description: `Prevent Media Device enumeration and unique IDs`,
				state: {
					all: { implemented: ``, },
				},
			},
			broadcastChannel: {
				title: `BroadcastChannel`,
				description: `Disable the firefox-proprietary BroadcastChannel`,
				state: {
					all: { stable: ``, },
				},
			},
		},
	},
};

// - do something about console.memory in chrome (?)
// - do image sets with variable resolution or css media queries leak the true devicePixelRatio?

}); })(this);
