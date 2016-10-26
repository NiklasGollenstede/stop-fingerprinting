(function() { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated, // wait for updates to be run
	'node_modules/es6lib/concurrent': { async, },
	'node_modules/es6lib/functional': { log, },
	'node_modules/es6lib/object': { MultiMap, deepFreeze, },
	'node_modules/web-ext-utils/chrome/': { Tabs, applications, rootUrl, Storage, },
	'node_modules/get-tld/': { Host, getTLD, },
	'common/profile-data': ProfileData,
	'common/utils': { notify, domainFromUrl, setBrowserAction, nameprep, },
	'common/options': options,
	'icons/urls': icons,
	ua: { Generator: NavGen, },
	ScreenGen,
}) {

const defaultProfData   = ProfileData.defaultProfile;
const ruleModel         = ProfileData.model.rules.children;
const profIdToData      = new Map;            // profileId         ==>  ProfileData, unsorted
const profIdToStack     = new Map;            // profileId         ==>  ProfileStack, sorted by the ProfileStack's .priority
const hostToSession     = new Map;            // HostPattern       ==>  Session, unsorted, only if Session can be shared between tabs
const tabIdToSession    = new Map;            // tabId             ==>  Session, unsorted, for every tab that currently holds a scriptable site
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

const HostPattern = cached(Object.assign((class HostPattern { // TODO: this needs a rewrite
	constructor(pattern) {
		this.pattern = pattern; console.log('new HostPattern', this);
		this.children = pattern.split(/\s*\|\s*/g).map(string => { switch (string.lastIndexOf('*')) {
			case -1: return new HostPattern.Single(string);
			case  0: return new HostPattern.AnySub(string);
			default: return new HostPattern.Pattern(string);
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
}), {
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
		if (tld === null) { HostPattern.tldError(this.pattern, domain); tld = '@'; }
		domain = domain.slice(0, anyTld ? -2 : -tld.length);
		const host = (/[^.]*$/).exec(domain)[0];
		const anyHost = host === '*';
		const sub = domain.slice(0, -host.length);
		const anySub = sub === '*.';
		const any = anySub && anyHost && anyTld;

		this.includes = any ? () => true : cached(_domain => {
			let _tld = getTLD(_domain);
			if (_tld === null) { HostPattern.tldError(_domain); _tld = '@'; }
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
}));

function detachTabs(equivs, reason) {
	setBrowserAction({
		filter: ({ url, }) => equivs.some(equiv => typeof equiv === 'string' ? url === equiv : equiv.includes(domainFromUrl(url))),
		icon: 'detached', title: reason,
	})
	.then(_=>_.forEach(tabId => {
		const session = tabIdToSession.get(tabId);
		if (!session) { return; }
		session.detachFromTab(tabId);
	}));
}

let count = 0;

class ProfileStack {
	constructor(data, parent) {
		if (count++ > 20) { throw new Error('count'); }
		data = data.children;
		this.parent = parent;
		this.id = data.id.value;
		this.data = data;
		this.priority = data.priority.value; // used for the sorting
		this.hostPatterns = this.data.include.values.current.map(_ => new HostPattern(_));
		data.rules.onAnyChange((value, { parent: { path, }, }) => this.clear(path.replace(/^\.?rules\./, ''))); // wil be removed on data.destroy()
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
				if (!data[child]) { debugger; console.log('message', model, data, values, child); }

				const ownValues = data[child].values.current;
				if (!ownValues.length) { return; } // no own values set ==> inherit through data.__proto__
				const ownValue = !model[child].maxLength || model[child].maxLength < 2 ? values[0] : values; // if at most one value is allowed ==> not an array type
				if (model[child].children && model[child].children.length && ownValues.some(_=>_)) { // trueisch own values and model is an object type
					set(values, child, Object.create(values[child] || null)); // inherit unset sub-values
					set(values[child], 'value', ownValue); // save the actual own value
					clone(model[child], data[child], values[child]); // recurse
				} else {
					set(values, child, ownValue);
				}
			});
		})(ruleModel, this.data.rules.children, this.values);

		function set(obj, key, value) { Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true, }); return value; }

		this.navGen = !this.values.navigator ? { generate() { return null; }, } : new NavGen(this.values.navigator); // TODO: XXX: these may throw
		this.screenGen = !this.values.screen ? { generate() { return null; }, } : new ScreenGen(this.values.screen); // TODO: XXX: these may throw
	}

	getSessionForPageLoad(tabId, host) {
		this.init();

		let hostPattern = this.hostPatterns.find(_=>_.includes(host));
		if (!hostPattern) {
			if (this === defaultStack) { hostPattern = new HostPattern(host); }
			else { throw new Error(`ProfileStack.newSession() called with wrong host`); }
		}

		switch (this.values.session) {
			case 'browser': {
				const session = hostToSession.get(hostPattern);
				if (session && !session.outdated) { return session; } // host was previously visited in this browser session
			} break;
			case 'tab': {
				const session = tabIdToSession.get(tabId);
				if (session && !session.outdated && session.hostPattern === hostPattern) { return session; } // host is loaded in this tab anyway
			} break;
			// case 'page': // must create a new session on every load
		}
		const session = new Session(this, hostPattern);

		switch (this.values.session) {
			case 'browser': {

				hostToSession.set(hostPattern, session); // host is being visited for the first time, save the session
			} break;
			// case 'tab': // nothing to do, only keep the session for same-host navigations, which this is not
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

	static find(host) {
		for (const [ , stack, ] of profIdToStack) {
			if (stack.hostPatterns.some(_=>_.includes(host))) { return stack; }
		}
		return defaultStack;
	}
}

class Session {
	constructor(stack, hostPattern) {
		this.stack = stack;
		this.hostPattern = hostPattern;
		this.outdaded = false;

		const data = this.data = { };
		Object; // TODO: do a deepPeepFlatteningClone from stack.values onto this.data
		data.nonce = Array.prototype.map.call(window.crypto.getRandomValues(new Uint32Array(6)), _=>_.toString(36)).join('');
		data.navigator = this.stack.navGen.generate();
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
}

addProfile('<default>');
options.children.profiles.whenChange((_, { current: ids, }) => {
	profIdToData.forEach((_, old) => !ids.includes(old) && removeProfile(old));
	Promise.all(ids.map(id => !profIdToData.has(id) && addProfile(id)))
	.then(() => mayRebuild++);
	mayRebuild--;
	needRebuild = true;
});


const Profiles = ({
	getSessionForPageLoad(tabId, host) { // never returns null, may only be called during a tabs top_frame request
		const stack = ProfileStack.find(host);
		return stack.getSessionForPageLoad(tabId, host);

		/*let session = tabIdToSession.get(arg.tabId);
		if (session && session.hostPattern.includes(arg.host)) {
			// found existing session and the host didn't change
			const stack = session.stack; // thus the stack is the correct one
			if ((arg.requestId != null && session.stack.sessionPerPage)) {
				return stack.newSession(arg); // top frame load ==> must create new session
			} else { return session; } // can use existing session
		}
		// no session yet or the host changed ==> create new one from the correct stack
		return stack.newSession(arg); // TODO: do only ever create new Sessions if requestId is set (on top frame load)
*/	},
	getSessionForTab(tabId, host) { // may return null
		let session = tabIdToSession.get(tabId);
		if (session && !session.hostPattern.includes(host)) {
			throw new Error(`The current session for tab ${ tabId } does not match the pattern ${ session.hostPattern }`);
		}
		return session || null;
	},
	detachFromTab(tabId, host) {
		let session = tabIdToSession.get(tabId);
		if (session || !session.hostPattern.includes(host)) { return; }
		tabIdToSession.delete(tabId);
	},
	findStack(host) {
		return ProfileStack.find(host);
	},
	getNames() {
		return [ ];
		/*return Array.from(profiles.values()).map(
			({ children: { id: { value: id, }, title: { value: name, }, }, }) => ({ id, name, })
		);*/
	},
	setTemp(domain, profileId) {
		return 0;
		/*(!profileId || profileId === '<none>') && (profileId = undefined);
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
		typeof equiv === 'string' && (equiv = new HostPattern.Single(equiv));
		setBrowserAction({ filter: ({ url, }) => equiv.includes(domainFromUrl(url)), icon: 'detached', title: 'tempChanged', });
		return retVal;*/
	},
	getTemp(domain) {
		return null;
		/*let equiv = getEquivalent(domain);
		const profile = domainTemps.get(equiv);
		return profile && profile.children.id.value;*/
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

function diff(before, after, mapper = x=>x) {
	before = new Set(before), after = new Set(after);
	const added = after, kept = new Set, deleted = new Set;
	before.forEach(e => after.has(e) ? (added.delete(e), kept.add(e)) : deleted.add(e));
	return { added: mapper(added), kept: mapper(kept), deleted: mapper(deleted), };
}

return Object.freeze(Profiles);

}); })();
