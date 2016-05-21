'use strict'; define('background/profiles', [
	'common/profile',
	'web-ext-utils/utils',
	'es6lib',
], function(
	Profile,
	{ matchPatternToRegExp, },
	{ concurrent: { async, }, }
) {

return function(options) {

const profiles = new Map;
const includes = new WeakMap;
let sorted = [ ];

const addProfile = async(function*(id) {
	const profile = (yield Profile(id));
	profiles.set(id, profile);

	const include = { pattern: [ ], regExp: [ ], all: [ ], };
	includes.set(profile, include);
	profile.include.children.regExp.whenChange((_, { current: values, }) => include.all = include.pattern.concat(include.regExp = values.map(s => new RegExp(s))));
	profile.include.children.pattern.whenChange((_, { current: values, }) => include.all = include.regExp.concat(include.pattern = values.map(matchPatternToRegExp)));
});

function removeProfile() { throw new Error('Not implemented'); }

function sortProfiles() {
	sorted = Array.from(profiles.values()).sort((a, b) => a.priority.value - b.priority.value);
}

options.profiles.whenChange((_, { current: ids, }) => {
	profiles.forEach((_, old) => !ids.includes(old) && removeProfile(old));
	Promise.all(ids.map(id => !profiles.has(id) && addProfile(id)))
	.then(sortProfiles);
});


return {
	get(url) {
		const matching = sorted.filter(profile => {
			return includes.get(profile).all.find(exp => {
				const match = exp.exec(url);
				return match && match[0] === url;
			});
		}).map(profile => profile.rules.children);
		const get = key => {
			const rules = matching.find(rules => rules[key].values.current.length);
			return rules ? rules[key].value : undefined;
		};
		return !get('disable') && {
			devicePixelRatio: get('devicePixelRatio'),
		};
	},
};

};

});
