define('common/options', [ // license: MPL-2.0
	'common/utils',
	'web-ext-utils/options',
	'web-ext-utils/chrome',
	'es6lib',
], function(
	{ DOMAIN_CHARS, },
	Options,
	{ storage: Storage, applications: { chromium, }, },
	{
		format: { RegExpX, },
		object: { deepFreeze, },
	}
) {

const defaults = deepFreeze([
	Object.assign({
		name: 'clearCache',
		title: 'Disable Caching',
		type: 'label',
	}, chromium ? { // chrome
		description: `In Chrome caching can't actually be disabled. The best that is possible (without command line flags) is to clear the browsing data on every web request`,
		default: true,
		children: [
			{
				name: 'where',
				title: 'Where',
				description: `Choose the type of locations for which to delete the browsing data`,
				type: 'menulist',
				default: 'unprotectedWeb',
				options: [
					{ value: false, label: `Nowhere. Don't interfere with the caching or any other browsing data (not recommended)`, },
					{ value: 'unprotectedWeb', label: `Websites that are not explicitly marked as protected (recommended)`, },
					{ value: 'protectedWeb', label: `Also include websites that are marked as "protected" by other extensions or chrome apps`, },
					{ value: 'extension', label: `Even include extension data. It is probably not a good idea to select this`, },
				],
			}, {
				name: 'what',
				title: 'What',
				description: `Choose which type of browsing data to delete`,
				type: 'menulist',
				default: 'active',
				options: [
					{ value: 'passive', label: `Passive server side cache only: Cache, AppCache and Plugin Data`, },
					{ value: 'active', label: `Also include programmatic storage: Cookies, JavaScript storages and Service Workers (recommended)`, },
					{ value: 'all', label: `All browsing data: Complete History including Downloads, Form Data and Saved Passwords`, },
				],
			},
		],
	} : { // firefox
		description: `This extension can't disable caching in Firefox. See the Firefox tab for more information`,
		default: false,
		children: [
			{ name: 'where', type: 'hidden', default: false, },
			{ name: 'what', type: 'hidden', default: false, },
		],
	}), {
		name: 'equivalentDomains',
		title: 'Equivalent Domains',
		description: ``, // TODO
		maxLength: Infinity,
		addDefault: String.raw`*.domain.com | www.domain.co.uk | *.*.berlin`,
		restrict: {
			match: {
				exp: RegExpX`^(?:
					(?: ^ | \s* \| \s* )      # '|' separated list of:
					(?:                                # '<sub>.<name>.<tld>':
						  (?:
							   \* \. |(?:    ${ DOMAIN_CHARS }+ \.)*      # '*' or a '.' terminated list of sub domain names
						) (?:
							   \*    |       ${ DOMAIN_CHARS }+           # '*' or a domain name
						) (?:
							\. \*    |(?: \. ${ DOMAIN_CHARS }+   )+      # '.*' or '.'+ TLD
						)
					)
				)+$`,
				message: `Each line must be a '|' separated list of domains (<sub>.<name>.<tld>)`,
			},
			unique: '.',
		},
		type: 'string',
	}, {
		name: 'debug',
		title: 'Enable debugging',
		description: `Enable some stuff that can definitely be used to compromise your privacy and security but is helpful when debugging`,
		type: 'bool',
		default: false,
		expanded: false,
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
]);

const listerners = new WeakMap;

return Object.assign(new Options({
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
}), { defaults, });


});
