'use strict'; define('background/profiles', [
	'background/ua',
	'common/profile',
	'web-ext-utils/chrome',
	'web-ext-utils/utils',
	'es6lib',
], function(
	{ Generator, },
	Profile,
	{ applications, },
	{ matchPatternToRegExp, },
	{
		concurrent: { async, },
		functional: { log, },
		object: { MultiMap, },
	}
) {

return function(options) {

const profiles = new Map; // uuid ==> Profile(id)
const profileIncludes = new WeakMap; // Profile(id) ==> { all: [RegExp], }
const profileStacks = new Map; // [uuid].join($) ==> ProfileStack
const profileInStack = new MultiMap; // Profile(id) ==> ProfileStack
let sortedProfiles = [ ]; // [Profile(id)] sorted by .priority

const addProfile = async(function*(id) {
	const profile = (yield Profile(id));
	profiles.set(id, profile);

	const include = { pattern: [ ], regExp: [ ], all: [ ], };
	profileIncludes.set(profile, include);
	profile.children.include.children.regExp.whenChange((_, { current: values, }) => include.all = include.pattern.concat(include.regExp = values.map(s => new RegExp(s))));
	profile.children.include.children.pattern.whenChange((_, { current: values, }) => include.all = include.regExp.concat(include.pattern = values.map(matchPatternToRegExp)));

	profile.children.priority.onChange(sortProfiles);

	console.log('added profile', profiles, profile);
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
	'navigator.maxAge': 10,
	'navigator.browser': applications.current,
};

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
		this.navGen = null;
		this.navigators = { };
		this.navMaxAge = this.get('navigator', 'maxAge') * 60000;

		console.log('created ProfileStack', this);
	}

	clearCache(key) {
		key.startsWith('navigator') && (this.navGen = null);
		key === 'navigator.maxAge' && (this.navMaxAge = this.get('navigator', 'maxAge') * 60000);
		console.log('ProfileStack.clearCache ed', this, key);
	}

	get(...keys) {
		for (let prefs of this.rules) {
			const pref = keys.reduce((prefs, key) => prefs[key].children, prefs).parent;
			if (pref.values.current.length) { return pref.value; }
		}
		return defaults[keys.join('.')];
	}

	getNavigator(domain) {
		let current = (this.navigators[domain] || (this.navigators[domain] = { date: 0, navigator: null, }));
		const now = Date.now();
		now - current.date > this.navMaxAge && (current.navigator = this.createNavigator(domain)) && (current.date = now);
		return current.navigator;
	}
	createNavigator(domain) {
		!this.navGen && (this.navGen = new Generator({
			browser: this.get('navigator', 'browser'),
			os: this.get('navigator', 'os'),
			osArch: this.get('navigator', 'osArch'),
			osAge: this.get('navigator', 'osAge'),
			browserAge: this.get('navigator', 'browserAge'),
			ieFeatureCount: this.get('navigator', 'ieFeatureCount'),
			ieFeatureExclude: this.get('navigator', 'ieFeatureExclude'),
		}));
		return log('created navigator for', domain, this.navGen.navigator());
	}

	getInjectOptions(domain) {
		if (this.get('disabled')) { return false; }
		return {
			navigator: this.getNavigator(domain),
			devicePixelRatio: this.get('devicePixelRatio'),
		};
	}

	destroy() {
		profileStacks.delete(this.key, this);
		this.profiles.forEach(s => profileInStack.delete(s, this));
	}
}


return {
	get(url) {
		const matching = sortedProfiles.filter(profile => {
			return profileIncludes.get(profile).all.find(exp => {
				const match = exp.exec(url);
				return match && match[0] === url;
			});
		});

		return new ProfileStack(matching);
	},
};

};

});
