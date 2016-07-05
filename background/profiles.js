define('background/profiles', [ // license: MPL-2.0
	'background/ua',
	'background/screen',
	'background/tld',
	'common/profile',
	'common/utils',
	'web-ext-utils/chrome',
	'web-ext-utils/utils',
	'es6lib',
], function(
	{ Generator: NavGen, Navigator: { prototype: { toJSON: NavToJSON, }, }, },
	{ Generator: ScreenGen, },
	getTLD,
	Profile,
	{ notify, nameprep, },
	{ applications, Tabs, },
	{ matchPatternToRegExp, },
	{
		concurrent: { async, },
		functional: { log, },
		object: { MultiMap, deepFreeze, },
	}
) {

const missing = Symbol('missing argument');

return function(options) {

const defaultValues     = Profile.defaultRules;
const ruleModel         = Profile.model.find(_=>_.name === 'rules').children;
const profiles          = new Map;            // profileId         ==>  Profile
let   profileIncludes   = new WeakMap;        // Profile(id)       ==>  [DomainPattern]
const profileStacks     = new Map;            // [id].join($)      ==>  ProfileStack
const profileInStack    = new MultiMap;       // Profile(id)       ==>  ProfileStack
let   sortedProfiles    = [ ];                // [Profile(id)] sorted by .priority
const uncommittetTabs   = new Map;            // requestId         ==>  TabProfile
const tabTemps          = new Map;            // tabId             ==>  Profile
let   equivalentDomains = [ ];                // [DomainPattern] sorted by apperance
const domainPartCache   = { };                // domain            ==>  { sub, host, tld, }

window.profiles = profiles;

const addProfile = async(function*(id) {
	const profile = (yield Profile(id));
	profiles.set(id, profile);

	profile.children.include.children.domain.onChange(() => profileIncludes.delete(profile));
	profile.children.priority.onChange(sortProfiles);

	console.log('added profile', profile);
});

function removeProfile(id) {
	const profile = profiles.get(id);
	profiles.delete(id);
	profile.destroy();
	profileInStack.get(profile).forEach(stack => stack.destroy());
	profileIncludes.delete(profile);
	sortProfiles();
	tabTemps.forEach((prof, tabId) => prof === profile && tabTemps.delete(tabId));

	console.log('removed profile', profiles, profile);
}

function sortProfiles() {
	sortedProfiles = Array.from(profiles.values()).sort((a, b) => a.children.priority.value - b.children.priority.value);
}

const DomainPattern = Object.assign(class DomainPattern {
	constructor(pattern) {
		this.pattern = pattern;
		this.children = pattern.split(/\s*\|\s*/g).map(string => { switch (string.lastIndexOf('*')) {
			case -1: return new DomainPattern.Single(string);
			case  0: return new DomainPattern.AnySub(string);
			default: return new DomainPattern.Pattern(string);
		} });
		return this.children.length === 1 ? this.children[0] : this;
	}

	includes(domain) {
		return this.children.every(_=>_.includes(domain));
	}

	static tldError(original, escaped = original) {
		notify.error({
			title: `Invalid domain name`,
			message: `The domain "${ original }"${ original !== escaped ? '('+ escaped +')' : '' } does not end with a valid TLD`,
		});
	}
}, {
	Single: function(domain) {
		this.pattern = domain;
		domain = nameprep(domain);
		this.includes = s => s === domain;
	},
	AnySub: function(domain) {
		this.pattern = domain;
		domain = nameprep(domain);
		const suffix = domain.slice(2), length = suffix.length;
		this.includes = s => s.length >= length && s.endsWith(suffix) && (s.length === length || s[s.length - length - 1] === '.');
	},
	Pattern: function(domain) {
		this.pattern = domain;
		domain = nameprep(domain);
		const anyTld = (/\.\*$/).test(domain);
		const tld = anyTld || getTLD(domain) || '';
		if (!tld) { DomainPattern.tldError(this.pattern, domain); }
		domain = domain.slice(0, anyTld ? -2 : -tld.length);
		const host = (/[^.]*$/).exec(domain)[0];
		const anyHost = host === '*';
		const sub = domain.slice(0, -host.length);
		const anySub = sub === '*.';
		const any = anySub && anyHost && anyTld;

		this.includes = any ? () => true : _domain => {
			const obj = domainPartCache[_domain] || (domainPartCache[_domain] = (() => {
				let domain = _domain;
				const tld = getTLD(domain) || '';
				if (!tld) { DomainPattern.tldError(domain); }
				domain = domain.slice(0, -tld.length);
				const host = (/[^.]*$/).exec(domain)[0];
				const sub = domain.slice(0, -host.length);
				return { sub, host, tld, };
			})());
			return (
				(anyTld || tld === obj.tld)
				&& (anyHost || host === obj.host)
				&& (anySub || sub === obj.sub)
			);
		};
		window.includes = this.includes; // XXX
	},
});

function getIncludes(profile) {
	let includes = profileIncludes.get(profile);
	if (includes) { return includes; }
	includes = profile.children.include.children.domain.values.current.map(domain => {
		const preped = nameprep(domain);
		return equivalentDomains.find(_=>_.includes(preped)) || new DomainPattern.Single(domain);
	});
	profileIncludes.set(profile, includes);
	return includes;
}

class ProfileStack {
	constructor(profiles) {
		const key = profiles.map(_=>_.children.id.value).join('$');
		if (profileStacks.has(key)) { return profileStacks.get(key); }
		this.key = key;
		this.profiles = profiles;
		this.rules = profiles.map(_=>_.children.rules.children);
		this.destroy = this.destroy.bind(this);
		this.rules.forEach(rule => rule.parent.onAnyChange((value, { parent: { path, }, }) => this.clear(path.replace(/^\.?rules\./, ''))));
		profileStacks.set(this.key, this);
		profiles.forEach(profile => profileInStack.add(profile, this));
		this.cache = new Map;
		this.tabs = new Map;

		console.log('created ProfileStack', this);
	}

	get navGen() {
		const options = this.get('navigator');
		const value = !options
		? { generate() { return null; }, }
		: new NavGen(options);
		console.log('created navGen', value);
		Object.defineProperty(this, 'navGen', { value, configurable: true, });
		return value;
	}

	getNavigator() {
		return this.navGen.generate();
	}

	get screenGen() {
		const options = this.get('screen');
		const value = !options
		? { generate() { return null; }, }
		: new ScreenGen(options); // TODO: offsets are passed in as an extra object but are expected as inline properties
		console.log('created screenGen', value);
		Object.defineProperty(this, 'screenGen', { value, configurable: true, });
		return value;
	}

	getScreen() {
		return this.screenGen.generate();
	}

	clear(key) {
		key = (/^[^\.]*/).exec(key)[0];
		console.log('ProfileStack.clear', key);
		key.startsWith('navigator') && (delete this.navGen);
		key.startsWith('screen') && (delete this.screenGen);
		this.cache.delete(key);
	}

	get(key) {
		if ((/\./).test(key)) { debugger; } // XXX: remove

		if (this.cache.has(key)) { return this.cache.get(key); }
		function get(model, rules, path) {
			rules = rules.filter(_=>_.values.current.length);
			const values = rules.length ? rules[0].values.current : defaultValues[path];
			if (!values) { debugger; } // XXX: remove

			if (model.children && model.children.length && values.some(_=>_)) {
				const object = { };
				model.children.forEach(child => object[child.name] = get(child, rules.map(_=>_.children[child.name]), path +'.' + child.name));
				return object;
			} else if (!model.maxLength || model.maxLength < 2) {
				return values[0];
			}
			return values;
		}
		const value = get(ruleModel.find(_=>_.name === key), this.rules.map(_=>_[key]), key);
		this.cache.set(key, value);
		return value;
	}

	getTab(id) {
		let tab = this.tabs.get(id);
		if (!tab) {
			tab = new TabProfile(this);
			this.tabs.set(id, tab);
		}
		return tab;
	}

	destroy() {
		profileStacks.delete(this.key, this);
		this.profiles.forEach(s => profileInStack.delete(s, this));
	}

	static find(domain, tabId = -1) {
		const tabTemp = tabId <= 0 && tabTemps.get(tabId);
		const matching = sortedProfiles.filter(profile => {
			const groups = getIncludes(profile);
			return profile !== tabTemp && groups.some(_=>_.includes(domain));
		});
		tabTemp && matching.unshift(tabTemp);

		return new ProfileStack(matching);
	}
}

class TabProfile {
	constructor(stack, requestId = missing) {
		requestId !== missing && uncommittetTabs.set(requestId, this);
		this.requestId = requestId;
		this.stack = stack;

		this.domains = new Map;
		console.log('TabProfile.created', this);
	}
	commit({ tabId, domain, }) {
		uncommittetTabs.delete(this.requestId);
		this.stack.tabs.set(tabId, this);
		this.tabId = tabId;
		console.log('TabProfile.commited', this);
	}
	destroy() {
		!uncommittetTabs.delete(this.requestId)
		&& this.stack.tabs.delete(this.tabId);
		console.log('TabProfile.destroyed', this);
	}
	getDomain(name) {
		let domain = this.domains.get(name);
		if (!domain) {
			domain = new DomainProfile(this, name);
			this.domains.set(name, domain);
		}
		return domain;
	}
}

class DomainProfile {
	constructor(tab, domain) {
		this.tab = tab;
		this.domain = domain;
		this.stack = tab.stack;
		console.log('DomainProfile.created', this);
	}

	get(key) {
		return this.stack.get(key);
	}

	get nonce() {
		return Array.prototype.map.call(window.crypto.getRandomValues(new Uint32Array(6)), _=>_.toString(36)).join('');
	}

	get disabled() {
		return this.get('disabled');
	}

	get logLevel() {
		return this.get('logLevel');
	}

	get hstsDisabled() {
		return this.get('hstsDisabled');
	}

	get navigator() {
		const navigator = this.stack.getNavigator();
		const logLevel = this.get('logLevel');
		navigator && notify.log({ title: 'Generated UA', message: navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''), domain: this.domain, tabId: this.tab.tabId, logLevel, });
		return navigator;
	}

	get plugins() {
		return this.get('plugins');
	}

	get devices() {
		return this.get('devices');
	}

	get windowName() {
		return this.get('windowName');
	}

	get screen() {
		return this.stack.getScreen();
	}

	get fonts() {
		return this.get('fonts');
	}

	get canvas() {
		return this.get('canvas');
	}

	get misc() {
		return {
			browser: applications.current,
		};
	}

	get debug() {
		return options.children.debug.value;
	}

	toJSON() {
		if (this.json) { return this.json; }
		if (this.disabled) { return false; }
		const json = { };
		DomainProfile.keys.forEach(key => json[key] = this[key]);
		return (this.json = json);
	}
}
DomainProfile.keys = Object.getOwnPropertyNames(DomainProfile.prototype).filter(key => {
	const getter = Object.getOwnPropertyDescriptor(DomainProfile.prototype, key).get;
	if (!getter) { return false; }
	Object.defineProperty(DomainProfile.prototype, key, { get() {
		const value = getter.call(this);
		Object.defineProperty(this, key, { value, configurable: true, });
		console.log('DomainProfile.'+ key, this.tab.tabId, this.tab.requestId, this.domain, value);
		return value;
	}, });
	return true;
});

options.children.profiles.whenChange((_, { current: ids, }) => {
	profiles.forEach((_, old) => !ids.includes(old) && removeProfile(old));
	Promise.all(ids.map(id => !profiles.has(id) && addProfile(id)))
	.then(sortProfiles);
});

options.children.equivalentDomains.whenChange((_, { current: patterns, }) => {
	equivalentDomains = patterns.map(p => equivalentDomains.find(g => g.pattern === p) || new DomainPattern(p));
	profileIncludes = new WeakMap;
});

return Object.freeze({
	create({ requestId, domain, tabId, }) {
		const stack = ProfileStack.find(domain, tabId);
		return new TabProfile(stack, requestId);
	},
	get({ requestId = missing, tabId = missing, domain = missing, }) {
		let tab = requestId !== missing && uncommittetTabs.get(requestId);
		if (tab) { return tab; }
		return domain !== missing && tabId !== missing && ProfileStack.find(domain, tabId).getTab(tabId);
	},
	findStack(domain) {
		return ProfileStack.find(domain);
	},
	get current() {
		return profiles;
	},
	setTemp(tabId, profileId) {
		if (profileId === '<none>') { return tabTemps.delete(tabId) * -1; }
		const profile = profiles.get(profileId);
		if (!profile) { throw new Error('No such Profile "'+ profileId +'"'); }
		tabTemps.set(tabId, profile);
		console.log('setTemp', tabId, profile);
		return 1;
	},
	getTemp(tabId) {
		const profile = tabTemps.get(tabId);
		return profile && profile.children.id.value;
	},
});

};

});
