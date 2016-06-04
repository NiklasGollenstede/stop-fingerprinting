'use strict'; define('background/profiles', [
	'background/ua',
	'background/screen',
	'common/profile',
	'web-ext-utils/chrome',
	'web-ext-utils/utils',
	'es6lib',
], function(
	{ Generator : NavGen, },
	{ Generator : ScreenGen, },
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

const profiles          = new Map;            // id                ==>  Profile(id)
const profileIncludes   = new WeakMap;        // Profile(id)       ==>  { all: [RegExp], }
const profileStacks     = new Map;            // [id].join($)      ==>  ProfileStack
const profileInStack    = new MultiMap;       // Profile(id)       ==>  ProfileStack
let   sortedProfiles    = [ ];                // [Profile(id)] sorted by .priority

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
	'screen.width':  { from: screen.width * 0.8, to: 3840, },
	'screen.height':  { from: screen.height * 0.8, to: 2160, },
	'screen.devicePixelRatio': { from: 1, to: window.devicePixelRatio * 1.25, },
	'screen.offset.bottom': { from: 30, to: 50, },
	'fonts.dispersion': 25,
};

const realNavigator = NavGen.keys.reduce((result, key) => ((result[key] = window.navigator[key]), result), { });
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
		this.navGen = null;
		this.navigators = { };
		this.screenGen = null;
		this.screens = { };
		this.cache = new Map;

		console.log('created ProfileStack', this);
	}

	clearCache(key) {
		key.startsWith('navigator') && (this.navGen = null) === (this.navigators = { });
		key.startsWith('screen') && (this.screenGen = null) === (this.screens = { });
		this.cache.delete(key);
		console.log('ProfileStack.clearCache ed', this, key);
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

	getNavigator(domain) {
		if (this.get('navigator.disabled')) { return realNavigator; }
		let current = (this.navigators[domain] || (this.navigators[domain] = { date: 0, navigator: null, }));
		const now = Date.now();
		now - current.date > this.get('navigator.maxAge') * 60000 && (current.navigator = this.createNavigator(domain)) && (current.date = now);
		return current.navigator;
	}
	createNavigator(domain) {
		!this.navGen && (this.navGen = new NavGen({
			browser: this.get('navigator.browser'),
			os: this.get('navigator.os'),
			osArch: this.get('navigator.osArch'),
			osAge: this.get('navigator.osAge'),
			browserAge: this.get('navigator.browserAge'),
			ieFeatureCount: this.get('navigator.ieFeatureCount'),
			ieFeatureExclude: this.get('navigator.ieFeatureExclude'),
		}));
		return log('created navigator for', domain, this.navGen.navigator());
	}

	getScreen(domain) {
		if (this.get('screen.disabled')) { return realScreen; }
		let current = (this.screens[domain] || (this.screens[domain] = { date: 0, screen: null, }));
		const now = Date.now();
		now - current.date > this.get('navigator.maxAge') * 60000 && (current.screen = this.createScreen(domain)) && (current.date = now);
		return current.screen;
	}
	createScreen(domain) {
		!this.screenGen && (this.screenGen = new ScreenGen({
			ratio: this.get('screen.ratio'),
			width: this.get('screen.width'),
			height: this.get('screen.height'),
			devicePixelRatio: this.get('screen.devicePixelRatio'),
			top: this.get('screen.offset.top'),
			right: this.get('screen.offset.right'),
			bottom: this.get('screen.offset.bottom'),
			left: this.get('screen.offset.left'),
		}));
		return log('created screen for', domain, this.screenGen.screen());
	}

	getInjectOptions(domain) {
		if (this.get('disabled')) { return false; }
		return {
			navigator: this.getNavigator(domain),
			screen: this.getScreen(domain),
			windowName: this.get('windowName'),
			fonts: {
				dispersion: this.get('fonts.dispersion'),
			},
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
