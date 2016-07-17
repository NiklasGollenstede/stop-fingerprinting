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
	(yield profile.resetAll());
	(yield options.children.profiles.values.splice(options.children.profiles.values.current.indexOf(id), 1));
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
	id === '<default>' ? tabs.set({ id, icon: createElement('span', { textContent: '\u2605'/* '★' */, style: {
		color: `hsl(90, 100%, 70%)`, fontWeight: 'bold',
		position: 'relative', top: '-7px',
		transform: 'scale(2)', display: 'block',
	}, }), }) : profile.children.priority.whenChange(prio => {
		tabs.set({ id, icon: createElement('span', { textContent: prio, style: {
			color: `hsl(${ prio * 10 }, 100%, 70%)`, fontWeight: 'bold',
			position: 'relative', top: '-7px',
		}, }), });
	});
	created && (tabs.active = id);
	window.profiles[id] = profile;
});

function onCommand({ name, }, value) {
	({
		addProfile: addProfile.bind(null, null, null),
		manage: name => ({
			delete: () => deleteProfile(this),
		})[name](),
	})[name](value);
}

const editors = new Map;

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
		editor = Editor({
			options: branch,
			host: createElement('div'),
			onCommand: onCommand.bind(branch),
		});
		editors.set(branch, editor);
		host.appendChild(editor);
	},
});

addProfile('<default>');

options.children.profiles.values.current.forEach(addProfile);

});
