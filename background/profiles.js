(function() { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated, // wait for updates to be run
	'node_modules/es6lib/concurrent': { _async, },
	'node_modules/es6lib/functional': { log, },
	'node_modules/es6lib/object': { MultiMap, deepFreeze, },
	'node_modules/web-ext-utils/chrome/': { Tabs, applications, rootUrl, Storage, },
	'common/options': options,
	'common/profile-data': ProfileData,
	'common/utils': { notify, domainFromUrl, setBrowserAction, },
	'icons/urls': icons,
	OriginPattern: { originFromPatternGroup, originFromUrl, },
	ua: { Generator: NavGen, },
	ScreenGen,
}) {

const defaultProfData   = ProfileData.defaultProfile;
const ruleModel         = ProfileData.model.rules.children;
const profIdToData      = new Map;            // profileId         ==>  ProfileData, unsorted
const profIdToStack     = new Map;            // profileId         ==>  ProfileStack, sorted by the ProfileStack's .priority
const originToSession   = new Map;            // Origin            ==>  Session, unsorted, only if Session can be shared between tabs
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

const addProfile = _async(function*(id) {
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

class ProfileStack {
	constructor(data, parent) {
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
		if (this.values) { return this; }
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
		return this;
	}

	getSessionForPageLoad(url, prev, isOverwrite) {
		this.init();

		let origin = this.origins.find(_=>_.includes(url));
		if (!origin) {
			if (
				this === defaultStack
				|| isOverwrite
			) { origin = originFromUrl(url); }
			else { throw new Error(`ProfileStack.newSession() called with wrong origin`); }
		}

		switch (this.values.session) {
			case 'browser': {
				const session = originToSession.get(origin);
				if (session && !session.outdated) { return session; } // origin was previously visited in this browser session
			} break;
			case 'tab': {
				if (prev && !prev.outdated && prev.origin === origin) { return prev; } // origin is loaded in this tab anyway
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
		this.sessions.forEach(session => session.outdate());
	}

	destroy(reason = 'profileDeleted') {
		this.clear();
		profIdToStack.delete(this.id, this);
	}

	static findStack(url) {
		for (const [ , stack, ] of profIdToStack) {
			if (stack.origins.some(_=>_.includes(url))) { return stack.init(); }
		}
		return defaultStack.init();
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
		data.debug && (data.profileTitle = stack.data.title.value);
		console.log('Session.created', this);
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
	getSessionForPageLoad(rawUrl, tempId, previous) {
		const url = new URL(rawUrl);
		const stack = tempId ? profIdToStack.get(tempId) : ProfileStack.findStack(url);
		return stack.getSessionForPageLoad(url, previous, !!tempId);
	},
	getNames() {
		return Array.from(profIdToData.values()).map(
			({ children: { id: { value: id, }, title: { value: name, }, }, }) => ({ id, name, })
		);
	},
	prepare() { /* triggers the asynchronous rebuild(), if necessary */ },
});

Object.keys(Profiles).forEach(key => {
	const member = Profiles[key];
	if (typeof member !== 'function') { return; }
	Profiles[key] = function() {
		needRebuild && rebuild();
		return member.apply(Profiles, arguments);
	};
});

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
