(function() { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated, // wait for updates to be run
	'node_modules/es6lib/concurrent': { async, },
	'node_modules/es6lib/functional': { log, },
	'node_modules/es6lib/object': { MultiMap, deepFreeze, },
	'node_modules/get-tld/': { Host, getTLD, },
	'node_modules/regexpx/': RegExpX,
	'node_modules/web-ext-utils/chrome/': { Tabs, applications, rootUrl, Storage, },
	'common/options': options,
	'common/profile-data': ProfileData,
	'common/utils': { notify, domainFromUrl, setBrowserAction, nameprep, },
	'icons/urls': icons,
	ua: { Generator: NavGen, },
	ScreenGen,
}) {

const defaultProfData   = ProfileData.defaultProfile;
const ruleModel         = ProfileData.model.rules.children;
const profIdToData      = new Map;            // profileId         ==>  ProfileData, unsorted
const profIdToStack     = new Map;            // profileId         ==>  ProfileStack, sorted by the ProfileStack's .priority
const originToSession   = new Map;            // Origin            ==>  Session, unsorted, only if Session can be shared between tabs
const tabIdToSession    = new Map;            // tabId             ==>  Session, unsorted, for every tab that currently holds a scriptable site
const tabIdToTempProfId = new Map;            // tabId             ==>  profileId, unsorted
let needRebuild = true; // rebuld() needs to be called before accessing any of the maps above.
let mayRebuild = 0; // a value below zero indicates that some ProfileData are still loading and the (synchronous) rebuld() must thus fail.
let defaultStack = null;

window.profiles = profIdToStack;

function rebuild() {
	needRebuild = false; // TODO: catch ... or something
	if (mayRebuild !== 0) { throw new Error(`Must not rebuild()`); }
	const stacks = new Map(profIdToStack), datas = new Set(profIdToData.values());
	let added;
	do {
		added = false;
		datas.forEach(data => {
			const profileId = data.children.id.value;
			if (stacks.has(profileId)) { return; }
			const parentId = data.children.inherits.value;
			if (!parentId) { stacks.set(profileId, new ProfileStack(data, null)); }
			else if (stacks.has(parentId)) { stacks.set(profileId, new ProfileStack(data, stacks.get(parentId))); }
			else { return; }
			added = true;
		});
	} while (added);
	if (stacks.size !== datas.size) { throw new Error(`Cyclic inherit`); }

	// insert into profIdToStack ordered by .priority
	profIdToStack.clear();
	Array.from(stacks.values()).sort((a, b) => b.priority - a.priority) // TODO: check order
	.forEach(stack => {
		if (stack.id === '<default>') { defaultStack = stack; }
		profIdToStack.set(stack.id, stack);
	});
	return; // that's it (?)
}

const addProfile = async(function*(id) {
	const data = (yield ProfileData(id));
	profIdToData.set(id, data);

	console.log('added ProfileData', profIdToData, profIdToStack, data);
});

function removeProfile(id) {
	const data = profIdToData.get(id);
	data && data.destroy(); // removes all event listeners
	profIdToData.delete(id);
	const stack = profIdToStack.get(id);
	stack && stack.destroy();
	profIdToStack.delete(id);
	console.log('removed ProfileData', profIdToData, profIdToStack, data);
}

const patternTypes = RegExpX`^(?: # anchor
	(file:\/\/.*)	# file:// url prefix
|				# OR
	(?:			# a "normal" url
		(			# scheme
			https?: | ftp: | \*:
		)				# is http, https, ftp or <any>
	\/\/)?				# is optional (default to https)
	(				# host
		(?:\*\.)?		# may start with '*.'
		[\w-]+			# must contain at least one word
		(?: \.[\w-]+ )*	# may contain more '.'+ word
		(?: :\d+ )?		# may have a port number
	)					# is not optional
	\/?
)$`;

/*interface Origin { // these are cached, so that there is only one instance per logical origin, which means that two Origins are equal iff o1 === o2
	includes(url: URL) : bool;
	toString() : string;
}*/

const originFromOrigin = cached(origin => ({
	origin,
	includes(url) { return url.origin === this.origin; },
	toString() { return this.origin; },
}));
const originFromUrl = url/*: URL */ => originFromOrigin(url.origin);

const originFromPattern = cached(function(pattern) {
	pattern = nameprep(pattern);
	const match = patternTypes.exec(pattern);
	if (!match) { throw new Error(`Pattern "${ pattern }" is invalid`); }
	let [ , filePrefix, protocol, host, ] = match;
	protocol || (protocol = 'https:');

	if (filePrefix) {
		return {
			prefix: filePrefix,
			includes(url) { return url.href.startsWith(this.prefix); },
			toString() { return this.prefix; },
		};
	}

	const anySub = host.includes('*');
	if (anySub) {
		if (host.lastIndexOf('*') !== host.indexOf('*')) { throw new Error(`Pattern "${ pattern }" contains more than one '*' in the host part`); }
		if (new Host(host).sub !== '*.') { throw new Error(`Pattern "${ pattern }" contains a '*' in a bad position`); }
	}

	if (!anySub && protocol !== '*') { return originFromOrigin((protocol +'//'+ host)); } // to get the correctly cached version

	return {
		pattern, protocol,
		suffix: anySub && host.slice(2),
		equals: !anySub && host,
		includes(url) {
			if (url.protocol !== this.protocol && this.protocol !== '*:') { return false; }
			return this.suffix ? url.host.endsWith(this.suffix) : url.host === this.equals;
		},
		toString() { return this.pattern; },
	};
});
const originFromPatternGroup = cached(function(patterns) {
	const split = patterns.split(/\s*\|\s*/);
	if (split.length === 1) { return originFromPattern(patterns); }
	const origins = split.map(originFromPattern);
	return {
		patterns, origins,
		includes(url) { return this.origins.some(_=>_.includes(url)); },
		toString() { return this.patterns; },
	};
});

let count = 0;

class ProfileStack {
	constructor(data, parent) {
		if (count++ > 20) { throw new Error('count'); } // TODO: remove
		data = data.children;
		this.parent = parent;
		this.id = data.id.value;
		this.data = data;
		this.priority = data.priority.value; // used for the sorting
		data.priority.whenChange(() => needRebuild = true); // TODO: this is expensive
		data.inherits.whenChange(() => needRebuild = true); // TODO: this is expensive
		data.include.whenChange((_, { current: origins, }) => this.origins = origins.map(originFromPatternGroup));
		data.rules.onAnyChange((value, { parent: { path, }, }) => this.clear(path.replace(/^\.?rules\./, ''))); // will be removed on data.destroy()
		this.sessions = new Set; // used to .outdade() them on this.clear() or .destroy()
		this.values = null;

		this.destroy = this.destroy.bind(this);
		console.log('created ProfileStack', this);
	}

	init() {
		if (this.values) { return; }
		this.parent && this.parent.init();
		this.values = Object.create(this.parent && this.parent.values || null);
		(function clone(model, data, values) {
			Object.keys(model).forEach(child => {
				const ownValues = data[child].values.current;
				if (!ownValues.length) { return; } // no own values set ==> inherit through data.__proto__
				const ownValue = !model[child].maxLength || model[child].maxLength < 2 ? ownValues[0] : ownValues; // if at most one value is allowed ==> not an array type
				if (model[child].children && ownValues.some(_=>_)) { // trueisch own values and model is an object type
					set(values, child, Object.create(values[child] || null)); // inherit unset sub-values
					set(values[child], 'value', ownValue); // save the actual own value
					clone(model[child].children, data[child].children, values[child]); // recurse
				} else {
					set(values, child, ownValue);
				}
			});
		})(ruleModel, this.data.rules.children, this.values);

		function set(obj, key, value) { Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true, }); return value; }

		this.navGen = !this.values.navigator ? { generate() { return null; }, } : new NavGen(this.values.navigator); // TODO: XXX: these may throw
		this.screenGen = !this.values.screen ? { generate() { return null; }, } : new ScreenGen(this.values.screen); // TODO: XXX: these may throw

		console.log('init done', this);
	}

	getSessionForPageLoad(tabId, url) {
		this.init();

		let origin = this.origins.find(_=>_.includes(url));
		if (!origin) {
			if (
				this === defaultStack
				|| tabIdToTempProfId.get(tabId) === this.id
			) { origin = originFromUrl(url); }
			else { throw new Error(`ProfileStack.newSession() called with wrong origin`); }
		}

		switch (this.values.session) {
			case 'browser': {
				const session = originToSession.get(origin);
				if (session && !session.outdated) { return session; } // origin was previously visited in this browser session
			} break;
			case 'tab': {
				const session = tabIdToSession.get(tabId);
				if (session && !session.outdated && session.origin === origin) { return session; } // origin is loaded in this tab anyway
			} break;
			// case 'page': // must create a new session on every load
		}
		const session = new Session(this, origin);

		switch (this.values.session) {
			case 'browser': {
				originToSession.set(origin, session); // origin is being visited for the first time, save the session
			} break;
			// case 'tab': // nothing to do, only keep the session for same-origin navigations, which this is not
		}

		this.sessions.add(session); // add to be able to .outdate() it
		return session;
	}

	clear(key = null) {
		this.values = null;

		// detach from current scopes
		this.sessions.forEach(session => session.outdade());
	}

	destroy(reason = 'profileDeleted') {
		this.clear();
		profIdToStack.delete(this.id, this);
	}

	static findStack(tabId, url) {
		const tempId = tabIdToTempProfId.get(tabId);
		if (tempId) { return profIdToStack.get(tempId); }
		for (const [ , stack, ] of profIdToStack) {
			if (stack.origins.some(_=>_.includes(url))) { return stack; }
		}
		return defaultStack;
	}
}

class Session {
	constructor(stack, origin) {
		this.stack = stack;
		this.origin = origin;
		this.outdaded = false;

		const data = this.data = { };
		deepDeepFlatteningClone(data, stack.values);
		data.nonce = Array.prototype.map.call(window.crypto.getRandomValues(new Uint32Array(6)), _=>_.toString(36)).join('');
		this.navigator = this.stack.navGen.generate();
		data.navigator = this.navigator && this.navigator.toJSON();
		data.screen = this.stack.screenGen.generate();
		data.debug = options.children.debug.value;
		console.log('Session.created', this);
	}

	attachToTab(tabId) {
		console.log('Session.attachToTab', this, tabId);
		tabIdToSession.set(tabId, this);
	}
	detachFromTab(tabId) {
		console.log('Session.detachFrom', this, tabId);
		tabIdToSession.get(tabId) === this && tabIdToSession.delete(tabId);
	}

	outdate() {
		this.outdaded = true;
	}
}

addProfile('<default>');
options.children.profiles.whenChange((_, { current: ids, }) => {
	profIdToData.forEach((_, old) => !ids.includes(old) && old !== '<default>' && removeProfile(old));
	Promise.all(ids.map(id => !profIdToData.has(id) && addProfile(id)))
	.then(() => mayRebuild++);
	mayRebuild--;
	needRebuild = true;
});

const Profiles = ({
	getSessionForPageLoad(tabId, rawUrl) { // never returns null, may only be called during a tabs top_frame request
		const url = new URL(rawUrl);
		const stack = ProfileStack.findStack(tabId, url);
		return stack.getSessionForPageLoad(tabId, url);
	},
	getSessionForTab(tabId, rawUrl) { // may return null
		const url = new URL(rawUrl);
		let session = tabIdToSession.get(tabId);
		if (session && !session.origin.includes(url)) {
			throw new Error(`The current session for tab ${ tabId } does not match the origin ${ session.origin }`);
		}
		return session || null;
	},
	detachFromTab(tabId, rawUrl) {
		const url = new URL(rawUrl);
		let session = tabIdToSession.get(tabId);
		if (session || !session.origin.includes(url)) { return; }
		tabIdToSession.delete(tabId);
	},
	findStack(tabId, rawUrl) {
		return ProfileStack.findStack(tabId, new URL(rawUrl));
	},
	getNames() {
		return Array.from(profIdToData.values()).map(
			({ children: { id: { value: id, }, title: { value: name, }, }, }) => ({ id, name, })
		);
	},
	setTempProfileForTab(tabId, profileId) {
		if (profileId == null) { return -tabIdToTempProfId.delete(tabId); }
		if (profIdToData.has(profileId)) { tabIdToTempProfId.set(tabId, profileId); return 1; }
		return 0;
	},
	getTempProfileForTab(tabId) /*: ?string */ {
		return tabIdToTempProfId.get(tabId) || null;
	},
});

Object.keys(Profiles).forEach(key => {
	const member = Profiles[key];
	if (typeof member !== 'function') { return; }
	Profiles[key] = function() {
		needRebuild && rebuild();
		return member.apply(Profiles, arguments);
	};
});

function cached(func, cache) {
	cache = cache || new Map;
	return function wrapper(arg) {
		let result = cache.get(arg);
		if (result !== undefined) { return result; }
		if (new.target) {
			Reflect.construct(func, arguments, new.target === wrapper ? func : new.target);
		} else {
			result = func.apply(this, arguments);
		}
		cache.set(arg, result);
		return result;
	};
}

function deepDeepFlatteningClone(target, source) {
	for (let key in source) {
		let value = source[key];
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			value = deepDeepFlatteningClone({ }, value);
		}
		target[key] = value;
	}
	return target;
}

return Object.freeze(Profiles);

}); })();
