define('background/profiles', [ // license: MPL-2.0
	'background/ua',
	'background/screen',
	'background/tld',
	'common/profile',
	'common/utils',
	'common/options',
	'icons/urls',
	'web-ext-utils/chrome',
	'web-ext-utils/utils',
	'es6lib',
], function(
	{ Generator: NavGen, Navigator: { prototype: { toJSON: NavToJSON, }, }, },
	{ Generator: ScreenGen, },
	getTLD,
	Profile,
	{ notify, nameprep, domainFromUrl, setBrowserAction, },
	options,
	icons,
	{ applications, Tabs, rootUrl, },
	{ matchPatternToRegExp, },
	{
		concurrent: { async, },
		functional: { log, },
		object: { MultiMap, deepFreeze, },
	}
) {

let   defaultRules      = Profile.defaultProfile.then((_ => defaultRules = _.children.rules.children));
const ruleModel         = Profile.model.find(_=>_.name === 'rules').children;
const profiles          = new Map;            // profileId         ==>  Profile
let   profileIncludes   = new WeakMap;        // Profile(id)       ==>  [DomainPattern]
const profileStacks     = new Map;            // [id].join($)      ==>  ProfileStack
const profileInStack    = new MultiMap;       // Profile(id)       ==>  ProfileStack
let   sortedProfiles    = [ ];                // [Profile(id)] sorted by .priority
const detachedScopes    = new Map;            // requestId         ==>  ProfileScope
const attachedScopes    = new Map;            // tabId             ==>  ProfileScope
const domainTemps       = new Map;            // DomainPattern|String ==>  Profile
let   equivalentDomains = [ ];                // [DomainPattern] sorted by apperance

window.profiles = profiles;

const addProfile = async(function*(id) {
	const profile = (yield Profile(id));
	profiles.set(id, profile);

	profile.children.include.children.domain.onChange(() => profileIncludes.delete(profile)); // TODO call detachScopes() on diff()
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
	domainTemps.forEach((prof, equiv) => prof === profile && domainTemps.delete(equiv));

	console.log('removed profile', profiles, profile);
}

function sortProfiles() {
	const _profiles = Array.from(profiles.values());
	const prio = new Map(_profiles.map(p => [ p, p.children.priority.value ]));
	sortedProfiles = _profiles.sort((a, b) => prio.get(b) - prio.get(a)); // descending

	// .destroy() all ProfileStacks whose order is now invalid
	for (let stack of profileStacks.values()) {
		isNaN(stack.profiles.reduce((last, now) => last > prio.get(now) ? prio.get(now) : NaN, Infinity)) && stack.destroy('profileReordered');
	}
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
		let tld = anyTld || getTLD(domain);
		if (tld === null) { DomainPattern.tldError(this.pattern, domain); tld = '@'; }
		domain = domain.slice(0, anyTld ? -2 : -tld.length);
		const host = (/[^.]*$/).exec(domain)[0];
		const anyHost = host === '*';
		const sub = domain.slice(0, -host.length);
		const anySub = sub === '*.';
		const any = anySub && anyHost && anyTld;

		this.includes = any ? () => true : cached(_domain => {
			let _tld = getTLD(_domain);
			if (_tld === null) { DomainPattern.tldError(_domain); _tld = '@'; }
			_domain = _domain.slice(0, -_tld.length);
			const _host = (/[^.]*$/).exec(_domain)[0];
			const _sub = _domain.slice(0, -_host.length);
			return (
				(anyTld || tld === _tld)
				&& (anyHost || host === _host)
				&& (anySub || sub === _sub)
			);
		});
	},
});

const getIncludes = cached(profile => profile.children.include.children.domain.values.current.map(getEquivalent), profileIncludes);

function getEquivalent(domain) {
	const preped = nameprep(domain);
	return equivalentDomains.find(_=>_.includes(preped)) || preped;
}

function getScopeId(type, { domain, tabId, requestId, }) {
	domain = type && type.domain ? '?'+ domain : '';
	switch (type && type.value) {
		case 'browser': return 'b'+ domain; // TODO: private mode
		case 'window': throw new Error('Not Implemented');
		case 'tab': return 't#'+ tabId + domain;
		case false: return 'r#'+ requestId;
		default: throw new Error('Invalid scope type "'+ type +'"');
	}
}

function detachScopes(equivs, title) {
	setBrowserAction({
		filter: ({ url, }) => equivs.some(equiv => typeof equiv === 'string' ? url === equiv : equiv.includes(domainFromUrl(url))),
		icon: 'detached', title,
	})
	.then(_=>_.forEach(tabId => {
		const scope = attachedScopes.get(tabId);
		if (!scope) { return; }
		scope.detachParent();
	}));
}

class ProfileStack {
	constructor(profiles) {
		const key = profiles.map(_=>_.children.id.value).join('$');
		if (profileStacks.has(key)) { return profileStacks.get(key); }
		this.key = key;
		this.profiles = profiles;
		this.rules = profiles.map(_=>_.children.rules.children);
		this.destroy = this.destroy.bind(this);
		this.rules.concat([ defaultRules, ]).forEach(rule => {
			rule.parent.onAnyChange((value, { parent: { path, }, }) => this.clear(path.replace(/^\.?rules\./, '')));
		});
		profileStacks.set(this.key, this);
		profiles.forEach(profile => profileInStack.add(profile, this));
		this.cache = new Map;
		this.scopes = new Map;

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

	get screenGen() {
		const options = this.get('screen');
		const value = !options
		? { generate() { return null; }, }
		: new ScreenGen(options);
		console.log('created screenGen', value);
		Object.defineProperty(this, 'screenGen', { value, configurable: true, });
		return value;
	}

	clear(key) {
		key = (/^[^\.]*/).exec(key)[0];
		console.log('ProfileStack.clear', key);
		key.startsWith('navigator') && (delete this.navGen);
		key.startsWith('screen') && (delete this.screenGen);
		this.cache.delete(key);

		// detach from current scopes
		const tabIds = [ ], scopes = new Set(this.scopes.values());
		attachedScopes.forEach((scope, tabId) => {
			if (!scopes.has(scope)) { return; }
			scope.detachParent();
			tabIds.push(tabId);
		});
		setBrowserAction({ tabIds, icon: 'detached', title: 'optionsChanged', });
	}

	get(key) {
		if (this.cache.has(key)) { return this.cache.get(key); }
		function get(model, rules, _default, path) {
			rules = rules.filter(_=>_.values.current.length);
			const values = rules.length ? rules[0].values.current : _default.values.current;

			if (model.children && model.children.length && values.some(_=>_)) {
				const object = { value: !model.maxLength || model.maxLength < 2 ? values[0] : values, };
				model.children.forEach(child => object[child.name] = get(
					child,
					rules.map(_=>_.children[child.name]),
					_default.children[child.name],
					path +'.' + child.name
				));
				return object;
			} else if (!model.maxLength || model.maxLength < 2) {
				return values[0];
			}
			return values;
		}
		const value = get(
			ruleModel.find(_=>_.name === key),
			this.rules.map(_=>_[key]),
			defaultRules[key],
			key
		);
		this.cache.set(key, value);
		return value;
	}

	scope(arg/*{ domain, tabId, requestId, }*/) {
		let scopeId = getScopeId(this.get('scope'), arg);
		let scope = this.scopes.get(scopeId) || new ProfileScope(this, scopeId, arg);
		this.scopes.set(scopeId, scope);
		return scope;
	}

	destroy(reason = 'profileDeleted') {
		detachScopes(Array.from(new Set([ ].concat(...this.profiles.map(getIncludes)))), reason);
		profileStacks.delete(this.key, this);
		this.profiles.forEach(s => profileInStack.delete(s, this));
	}

	static find(equiv) {
		const domainTemp = domainTemps.get(equiv);
		const matching = sortedProfiles.filter(profile => {
			const groups = getIncludes(profile);
			return profile !== domainTemp && groups.includes(equiv);
		});
		domainTemp && matching.unshift(domainTemp);

		return new ProfileStack(matching);
	}
}

class ProfileScope {
	constructor(stack, scopeId, { domain, tabId, requestId, }) {
		this.id = scopeId;
		this.stack = stack;
		this.domain = domain;
		this.tabIds = new Set;
		if ((/^r/).test(scopeId)) {
			detachedScopes.set(this.requestId = requestId, this);
		} else {
			attachedScopes.set(tabId, this);
			this.tabIds.add(tabId);
		}
		console.log('ProfileScope.created', this);
	}

	attachTo(tabId) {
		console.log('ProfileScope.attachTo', this, tabId);
		detachedScopes.delete(this.requestId);
		delete this.requestId;
		attachedScopes.set(tabId, this);
		this.tabIds.add(tabId);
	}
	detachFrom(tabId) {
		console.log('ProfileScope.detachFrom', this, tabId);
		attachedScopes.get(tabId) === this && attachedScopes.delete(tabId);
		this.tabIds.delete(tabId);
		!this.tabIds.size && this.stack.scopes.delete(this.id);
	}
	detachFromAll() {
		console.log('ProfileScope.detachAll', this);
		detachedScopes.delete(this.requestId);
		this.tabIds.forEach(tabId => attachedScopes.get(tabId) === this && attachedScopes.delete(tabId));
		this.tabIds.clear();
		this.stack.scopes.delete(this.id);
	}
	detachParent() {
		console.log('ProfileScope.detachParent', this, this.stack);
		this.stack.scopes.delete(this.id);
		this.stack = null;
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
		const navigator = this.stack.navGen.generate();
		const logLevel = this.get('logLevel');
		navigator && notify.log({ title: 'Generated UA', message: navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''), domain: this.domain, tabId: this.tabId, logLevel, });
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
		return this.stack.screenGen.generate();
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
		ProfileScope.keys.forEach(key => json[key] = this[key]);
		return (this.json = json);
	}
}
ProfileScope.keys = Object.getOwnPropertyNames(ProfileScope.prototype).filter(key => {
	const getter = Object.getOwnPropertyDescriptor(ProfileScope.prototype, key).get;
	if (!getter) { return false; }
	Object.defineProperty(ProfileScope.prototype, key, { get() {
		const value = getter.call(this);
		Object.defineProperty(this, key, { value, configurable: true, });
		// console.log('ProfileScope.'+ key, this.tab.tabId, this.tab.requestId, this.domain, value);
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
	const { added, deleted, } = diff(equivalentDomains.map(_=>_.pattern), patterns), outdated = [ ];
	deleted.forEach(p => outdated.push(equivalentDomains.find(_=>_.pattern === p)));
	equivalentDomains = patterns.map(p => equivalentDomains.find(_=>_.pattern === p) || new DomainPattern(p));
	added.forEach(p => outdated.push(equivalentDomains.find(_=>_.pattern === p)));
	setBrowserAction({ filter: ({ url, }) => outdated.some(_=>_.includes(domainFromUrl(url))), icon: 'detached', title: 'equivChanged', });

	profileIncludes = new WeakMap;
});


const Profiles = Object.freeze({
	create(arg/*{ domain, tabId, requestId, }*/) {
		const equiv = getEquivalent(arg.domain);
		const stack = ProfileStack.find(equiv);
		return stack.scope(arg);
	},
	get({ tabId, requestId, /*domain,*/ }) {
		return requestId && detachedScopes.get(requestId) || attachedScopes.get(tabId) || Profiles.create(arguments[0]);
	},
	findStack(domain) {
		return ProfileStack.find(getEquivalent(domain));
	},
	get current() {
		return profiles;
	},
	setTemp(domain, profileId) {
		(!profileId || profileId === '<none>') && (profileId = undefined);
		let retVal = 1, icon = icons.temp;
		let equiv = getEquivalent(domain);
		const current = domainTemps.get(equiv);
		if (profileId === (current && current.children.id.value)) { return 0; }

		if (!profileId) {
			retVal = -1;
			domainTemps.delete(equiv);
		} else {
			const profile = profiles.get(profileId);
			if (!profile) { throw new Error('No such Profile "'+ profileId +'"'); }
			domainTemps.set(equiv, profile);
		}
		typeof equiv === 'string' && (equiv = new DomainPattern.Single(equiv));
		setBrowserAction({ filter: ({ url, }) => equiv.includes(domainFromUrl(url)), icon: 'detached', title: 'tempChanged', });
		return retVal;
	},
	getTemp(domain) {
		let equiv = getEquivalent(domain);
		const profile = domainTemps.get(equiv);
		return profile && profile.children.id.value;
	},
});

function cached(func, cache) {
	cache = cache || new Map;
	return function(arg) {
		let result = cache.get(arg);
		if (result !== undefined) { return result; }
		result = func.apply(this, arguments);
		cache.set(arg, result);
		return result;
	};
}

function diff(before, after, mapper = x=>x) {
	before = new Set(before), after = new Set(after);
	const added = after, kept = new Set, deleted = new Set;
	before.forEach(e => after.has(e) ? (added.delete(e), kept.add(e)) : deleted.add(e));
	return { added: mapper(added), kept: mapper(kept), deleted: mapper(deleted), };
}

return Profiles;

});
