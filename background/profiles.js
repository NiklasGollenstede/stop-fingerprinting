'use strict'; define('background/profiles', [
	'background/ua',
	'background/screen',
	'common/profile',
	'common/utils',
	'web-ext-utils/chrome',
	'web-ext-utils/utils',
	'es6lib',
], function(
	{ Generator: NavGen, Navigator: { prototype: { toJSON: NavToJSON, }, }, },
	{ Generator: ScreenGen, },
	Profile,
	{ notify, },
	{ applications, Tabs, },
	{ matchPatternToRegExp, },
	{
		concurrent: { async, },
		functional: { log, },
		object: { MultiMap, },
	}
) {

const missing = Symbol('missing argument');

return function(options) {

const profiles          = new Map;            // id                ==>  Profile(id)
const profileIncludes   = new WeakMap;        // Profile(id)       ==>  { all: [RegExp], }
const profileStacks     = new Map;            // [id].join($)      ==>  ProfileStack
const profileInStack    = new MultiMap;       // Profile(id)       ==>  ProfileStack
let   sortedProfiles    = [ ];                // [Profile(id)] sorted by .priority
const uncommittetTabs   = new Map;            // requestId         ==>  TabProfile

window.profiles = profiles;

const addProfile = async(function*(id) {
	const profile = (yield Profile(id));
	profiles.set(id, profile);

	const include = { pattern: [ ], regExp: [ ], all: [ ], };
	profileIncludes.set(profile, include);
	profile.children.include.children.regExp.whenChange((_, { current: values, }) => include.all = include.pattern.concat(include.regExp = values.map(s => new RegExp(s))));
	profile.children.include.children.pattern.whenChange((_, { current: values, }) => include.all = include.regExp.concat(include.pattern = values.map(matchPatternToRegExp)));

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

	console.log('removed profile', profiles, profile);
}

function sortProfiles() {
	sortedProfiles = Array.from(profiles.values()).sort((a, b) => a.children.priority.value - b.children.priority.value);

	console.log('sorted profiles', sortedProfiles);
}

options.children.profiles.whenChange((_, { current: ids, }) => {
	profiles.forEach((_, old) => !ids.includes(old) && removeProfile(old));
	Promise.all(ids.map(id => !profiles.has(id) && addProfile(id)))
	.then(sortProfiles);
});

const defaults = {
	'hstsDisabled': true,
	'navigator.browser': applications.current,
	'plugins.hideAll': true,
	'devices.hideAll': true,
	'screen.width':  { from: screen.width * 0.8, to: 3840, },
	'screen.height':  { from: screen.height * 0.8, to: 2160, },
	'screen.devicePixelRatio': { from: 1, to: window.devicePixelRatio * 1.25, },
	'screen.offset.bottom': { from: 30, to: 50, },
	'fonts.dispersion': 25,
};

const realNavigator = NavToJSON.call(window.navigator);
const realScreen = ScreenGen.keys.reduce((result, key) => ((result[key] = window.screen[key]), result), { });
realScreen.devicePixelRatio = window.devicePixelRatio;

class ProfileStack {
	constructor(settings) {
		const key = settings.map(s => s.children.id.value).join('$');
		if (profileStacks.has(key)) { return profileStacks.get(key); }
		this.key = key;
		this.profiles = settings;
		this.rules = settings.map(s => s.children.rules.children);
		this.destroy = this.destroy.bind(this);
		this.rules.forEach(rule => rule.parent.onAnyChange((value, { parent: { path, }, }) => this.clearCache(path.replace(/^\.?rules\./, ''))));
		profileStacks.set(this.key, this);
		settings.forEach(s => profileInStack.add(s, this));
		this.cache = new Map;
		this.tabs = new Map;

		console.log('created ProfileStack', this);
	}

	get navGen() {
		const value = this.get('navigator.disabled')
		? { generate() { return realNavigator; }, }
		: new NavGen({
			browser: this.get('navigator.browser'),
			os: this.get('navigator.os'),
			osArch: this.get('navigator.osArch'),
			cpuCores: this.get('navigator.cpuCores'),
			osAge: this.get('navigator.osAge'),
			browserAge: this.get('navigator.browserAge'),
			ieFeatureCount: this.get('navigator.ieFeatureCount'),
			ieFeatureExclude: this.get('navigator.ieFeatureExclude'),
			dntChance: this.get('navigator.dntChance'),
		});
		console.log('created navGen', value);
		Object.defineProperty(this, 'navGen', { value, configurable: true, });
		return value;
	}

	getNavigator() {
		if (this.get('navigator.disabled')) { return null; }
		return this.navGen.generate();
	}

	get screenGen() {
		const value = this.get('screen.disabled')
		? { generate() { return realScreen; }, }
		: new ScreenGen({
			ratio: this.get('screen.ratio'),
			width: this.get('screen.width'),
			height: this.get('screen.height'),
			devicePixelRatio: this.get('screen.devicePixelRatio'),
			top: this.get('screen.offset.top'),
			right: this.get('screen.offset.right'),
			bottom: this.get('screen.offset.bottom'),
			left: this.get('screen.offset.left'),
		});
		console.log('created screenGen', value);
		Object.defineProperty(this, 'screenGen', { value, configurable: true, });
		return value;
	}

	getScreen() {
		if (this.get('screen.disabled')) { return null; }
		return this.screenGen.generate();
	}

	clearCache(key) {
		console.log('ProfileStack.clearCache', key);
		key.startsWith('navigator') && (delete this.navGen);
		key.startsWith('screen') && (delete this.screenGen);
		this.cache.delete(key);
	}

	get(key) {
		if (this.cache.has(key)) { return this.cache.get(key); }
		const keys = key.split('.');
		let value = defaults[key];
		for (let prefs of this.rules) {
			const pref = keys.reduce((prefs, key) => prefs[key].children, prefs).parent;
			if (pref.values.current.length) { value = pref.value; break; }
		}
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

	static find(url) {
		const matching = sortedProfiles.filter(profile => {
			return profileIncludes.get(profile).all.find(exp => {
				const match = exp.exec(url);
				return match && match[0] === url;
			});
		});

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
	commit({ tabId, url, }) {
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
		return Array.prototype.map.call(window.crypto.getRandomValues(new Uint32Array(6)), r => r.toString(36)).join('');
	}

	get disabled() {
		return this.get('disabled');
	}

	get hstsDisabled() {
		return this.get('hstsDisabled');
	}

	get navigator() {
		const navigator = this.stack.getNavigator();
		const logLevel = 0; // navigator.logLevel = this.get('navigator.logLevel');
		navigator && notify.log({ title: 'Generated UA', message: navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''), domain: this.domain, tabId: this.tab.tabId, logLevel, });
		return navigator;
	}

	get plugins() {
		return {
			hideAll: this.get('plugins.hideAll'),
		};
	}

	get devices() {
		return {
			hideAll: this.get('devices.hideAll'),
		};
	}

	get keepWindowName() {
		return this.get('keepWindowName');
	}

	get screen() {
		return this.stack.getScreen();
	}

	get fonts() {
		if (this.get('fonts.disabled')) { return null; }
		return {
			dispersion: this.get('fonts.dispersion'),
		};
	}

	get canvas() {
		if (this.get('canvas.disabled')) { return null; }
		return { };
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


return {
	create({ requestId, url, }) {
		const stack = ProfileStack.find(url);
		return new TabProfile(stack, requestId);
	},
	get({ requestId = missing, tabId = missing, url = missing, }) {
		let tab = requestId !== missing && uncommittetTabs.get(requestId);
		if (tab) { return tab; }
		return url !== missing && tabId !== missing && ProfileStack.find(url).getTab(tabId);
	},
	resetTab(tabId) {
		profileStacks.forEach(stack => stack.resetTab(tabId));
	},
};

};

});
