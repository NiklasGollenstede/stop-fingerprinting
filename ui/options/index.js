'use strict'; // license: MPL-2.0

const {
	concurrent: { async, },
	dom: { createElement, DOMContentLoaded, },
	format: { Guid },
} = require('es6lib');

const Options = require('web-ext-utils/options');
const Editor = require('web-ext-utils/options/editor');
const Tabs = require('web-ext-utils/tabview');
const Profile = require('common/profile');

require('common/options').then(options => {

window.options = options;
window.profiles = { };

const deleteProfile = async(function*(profile) {
	const id = profile.children.id.value;
	(yield options.children.profiles.values.splice(options.children.profiles.values.current.indexOf(id), 1));
	profile.resetAll();
	tabs.active = 'options';
	tabs.remove(id);
	editors.delete(profile);
	delete window.profiles[id];
});

const addProfile = async(function*(id) {
	const created = !id;
	if (created) {
		id = `{${ Guid() }}`;
		(yield options.children.profiles.values.splice(Infinity, 0, id));
	}
	const profile = (yield Profile(id));
	tabs.add({
		id,
		data:  { branch: profile, },
	});
	profile.children.title.whenChange(title => {
		tabs.set({ id, title, });
	});
	profile.children.priority.whenChange(prio => {
		tabs.set({ id, icon: createElement('span', { textContent: prio, style: {
			color: `hsl(${ prio * 10 }, 100%, 70%)`, fontWeight: 'bold',
			position: 'relative', top: '-7px',
		}, }), });
	});
	created && (tabs.active = id);
	window.profiles[id] = profile;
});

function onOptionCommand({ name, }, value) {
	({
		addProfile: addProfile.bind(null, null, null),
	})[name](value);
}

function onProfileCommand({ name, }, value) {
	({
		manage: name => ({
			delete: () => deleteProfile(this),
		})[name](),
	})[name](value);
}

const editors = new Map;
let defaultProfile;

const tabs = new Tabs({
	host: document.body,
	content: createElement('div', {style: {
		padding: '10px', overflowY: 'scroll',
	}, }),
	active: 'options',
	style: 'horizontal firefox',
	tabs: [
		{
			id: 'options',
			title: 'General',
			icon: chrome.extension.getURL('icons/options/96.png'),
			data: { branch: options, },
		},
	],
	onSelect({ id, data: { branch, }, }) {
		const host = this.content;
		host.textContent = '';
		let editor = editors.get(branch);
		if (editor) { return host.appendChild(editor); }
		const onCommand = branch === options ? onOptionCommand : onProfileCommand.bind(branch);
		editor = Editor({
			options: branch,
			host: createElement('div'),
			onCommand,
		});
		if (branch === defaultProfile) {
			editor = createElement('div', { }, [
				createElement('h2', { innerHTML: (`
This page lists the default values that are used unless they are overwritten by a profile.
<br>Some of these values are browser dependant and may change in future versions of this extension.
				`), }),
				editor.querySelector('.pref-container.pref-name-rules'),
			]);
			Array.prototype.forEach.call(editor.querySelectorAll('.remove-value-entry, .add-value-entry'), e => e.remove());
			Array.prototype.forEach.call(editor.querySelectorAll('input:not(.toggle-switch), select, textarea'), i => i.disabled = true);
		}
		editors.set(branch, editor);
		host.appendChild(editor);
	},
});

new Options({
	defaults: Profile.defaults,
	prefix: 'default',
	storage: { get() {
		const _in = Profile.defaultRules, _out = { };
		Object.keys(_in).forEach(key => _out['default.rules.'+ key] = _in[key]);
		return Promise.resolve(_out); }, },
}).then(_default => tabs.add({
	id: 'default',
	title: '<default>',
	icon: createElement('span', { textContent: '\u2605'/* '★' */, style: {
			color: `hsl(90, 100%, 70%)`, fontWeight: 'bold',
			position: 'relative', top: '-7px',
			transform: 'scale(2)', display: 'block',
		}, }),
	data:  { branch: (defaultProfile = _default), },
}));

options.children.profiles.values.current.forEach(addProfile);

});
