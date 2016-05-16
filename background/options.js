'use strict'; define('background/options', [
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
		name: 'excludeRegEx',
		title: 'Exclude by regular expression',
		description: 'Sites whose urls entirely match any of the expressions below will be excluded by this extension',
		maxLength: Infinity,
		addDefault: '^(?:https?://www\.domain\.com/.*)$',
		restrict: { type: 'string', },
		type: 'string',
	}, {
		name: 'excludePattern',
		title: 'Exclude by match pattern',
		description: `
Sites whose urls match any of the patterns below will be excluded by this extension.
Patterns are url-prefixes which allow * wildcards at certain positions.
They must have the form <scheme>://<host>/<path>
For more information read https://developer.chrome.com/extensions/match_patterns
Examples:
	https://*.good.org/
	*://nice.web/sites*
	https://just.one_domain.net/*
`.trim(),
		maxLength: Infinity,
		addDefault: '*://*.domain.com/*',
		restrict: { match: RegExpX`^(?:
			( \* | http | https | file | ftp ) # <scheme>
			:\/\/
			( \* | (?:\*\.)? [^\/\*]+ | ) # <host>
			\/
			( .* ) # <path>
		)$`, message: 'Each pattern must be of the form <scheme>://<host>/<path>', },
		type: 'string',
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
