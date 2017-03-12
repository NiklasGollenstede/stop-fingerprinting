(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': _,
	'node_modules/es6lib/functional': { cached, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	'common/profile-data': ProfileData,
	ua: { Generator: NavGen, },
	ScreenGen,
}) => {

// const defaultProfData   = ProfileData.defaultProfile;
const ruleModel         = ProfileData.model.rules.children;
const profIdToData      = new Map/*<profileId, Promise<ProfileData>>*/;
const profIdToStack     = new Map/*<profileId, Promise?<ProfileStack>>*/;
const ctxIdToStack      = new Map/*<ctxId,     ProfileStack>*/;
const ctxIdToTempStack  = new Map/*<ctxId,     ProfileStack>*/;
const onChanged = new Event;

const getProfileData = cached(async id => ProfileData(id), profIdToData);
const getProfileStack = cached(async id => {
	const data = (await getProfileData(id));
	const parentId = data.children.inherits.value;
	const parent = parentId && (await getProfileStack(parentId));
	const stack = new ProfileStack(data, parent);
	profIdToStack.set(id, stack);
	return stack;
}, profIdToStack);

async function addProfile(id) {
	const stack = (await getProfileStack(id));
	console.log('added ProfileData', profIdToData, profIdToStack, stack);
}

async function removeProfile(id) {
	const data = (await profIdToData.get(id));
	data && data.destroy(); // removes all event listeners
	profIdToData.delete(id);
	const stack = (await profIdToStack.get(id));
	stack && onChanged.fire(stack.ids);
	stack && stack.destroy();
	profIdToStack.delete(id);
	console.log('removed ProfileData', profIdToData, profIdToStack, stack);
}

class ProfileStack {
	constructor(data, parent) {
		data = data.children;
		this.parent = parent;
		this.id = data.id.value;
		this.isRoot = this.id === '<default>';
		this.data = data;
		this.values = null;
		this.result = null;

		data.inherits.whenChange(() => (this.parent = null) === onChanged.fire(this.ids)); // must always have parent (unless .isRoot) ==> rebuild
		data.rules.onAnyChange((value, { parent: { path, }, }) => this.clear(path.replace(/^\.?rules\./, ''))); // listeners will be removed on data.destroy()
		data.ctxId.whenChange((_, { current: ids, }) => {
			ctxIdToStack.forEach((stack, id) => stack === this && ctxIdToStack.delete(id));
			ids.forEach(id => ctxIdToStack.set(id, this));
		});

		this.destroy = this.destroy.bind(this);
		console.log('created ProfileStack', this);
	}

	get ids() {
		return this.data.ctxId.values;
	}

	init() {
		if (!this.isRoot && !this.parent) {
			this.parent = profIdToStack.get(this.data.inherits.value);
			if (!this.parent || typeof this.parent.then === 'function') {
				throw new Error(`Profile parent is not yet ready`);
			}
		}
		this.parent && this.parent.init();

		if (!this.values) {
			this.values = Object.create(this.parent && this.parent.values || null);
			clone(ruleModel, this.data.rules.children, this.values);
			this.navGen = !this.values.navigator ? { generate() { return null; }, } : new NavGen(this.values.navigator).makeValid();
			this.screenGen = !this.values.screen ? { generate() { return null; }, } : new ScreenGen(this.values.screen).makeValid();
			console.log('profile values rebuilt', this);
		}

		if (!this.result) {
			const result = this.result = deepDeepFlatteningClone({ }, this.values);
			result.nonce = Array.prototype.map.call(global.crypto.getRandomValues(new Uint32Array(6)), _=>_.toString(32)).join('');
			result.navigator = this.navGen.generate();
			result.screen = this.screenGen.generate();
			result.debug = options.debug.value;
			result.debug && (result.profileTitle = this.data.title.value);
			console.log('profile result rebuilt', this);
		}

		function clone(model, data, values) {
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
		}
		function set(obj, key, value) { Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true, }); return value; }
	}

	clear(/*key = null*/) {
		this.values = null;
		onChanged.fire(this.ids);
	}

	refresh() {
		this.result = null;
		onChanged.fire(this.ids);
	}

	getData() {
		this.init();
		return this.result;
	}

	destroy(/*reason = 'profileDeleted'*/) {
		this.clear();
		profIdToStack.delete(this.id, this);
	}
}

(await Promise.all([ '<default>', ].concat(options.profiles.values.current).map(addProfile)));
const defaultStack = (await profIdToStack.get('<default>'));

options.profiles.onChange(async (_, { current: ids, }) => { try {
	(await Promise.all(Array.from(profIdToData.keys(), old => !ids.includes(old) && old !== '<default>' && removeProfile(old))));
	(await Promise.all(ids.map(addProfile)));
} catch (error) { reportError(error); } });

const Profiles = ({
	get(ctxId) {
		return (ctxIdToTempStack.get(ctxId) || ctxIdToStack.get(ctxId) || defaultStack).getData();
	},
	onChanged: onChanged.event,
	getNames() {
		return Array.from(profIdToStack.values(),
			({ id, data: { title: { value: name, }, }, }) => ({ id, name, })
		);
	},
	getTemp(ctxId) {
		const stack = ctxIdToTempStack.get(ctxId);
		return stack && stack.id; // ...
	},
	setTemp(ctxId, id) {
		if (id == null) {
			ctxIdToTempStack.delete(ctxId);
			return true;
		} else {
			const stack = profIdToStack.get(id);
			stack && ctxIdToTempStack.set(ctxId, stack);
			return !!stack;
		}
	},
	getHandledCtxTds() {
		return new Set(ctxIdToStack.values());
	},
});

function deepDeepFlatteningClone(target, source) {
	for (const key in source) {
		let value = source[key];
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			value = deepDeepFlatteningClone({ }, value);
		}
		target[key] = value;
	}
	return target;
}

function Event() {
	const listeners = new Set;
	return {
		listeners,
		fire() {
			listeners.forEach(listener => { try { listener.apply(null, arguments); } catch (error) { console.error(error); } });
		},
		event: {
			addListener(listener) { typeof listener === 'function' && listeners.add(listener); },
			hasListener(listener) { return listeners.has(listener); },
			removeListener(listener) { listeners.delete(listener); },
		},
	};
}

return Object.freeze(Profiles);

}); })(this);
