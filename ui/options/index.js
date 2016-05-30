'use strict';

const {
	concurrent: { async, },
	dom: { createElement, DOMContentLoaded, },
	format: { Guid },
} = require('es6lib');

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
	let created = false;
	if (!id) {
		id = `{${ Guid() }}`;
		(yield options.children.profiles.values.splice(Infinity, 0, id));
		created = true;
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
			position: 'relative', top: '-6px',
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

const tabs = new Tabs({
	host: document.body,
	content: createElement('div', {style: {
		padding: '10px',
	}, }),
	active: 'options',
	style: 'horizontal firefox',
	tabs: [
		{
			id: 'options',
			title: 'Options',
			icon: chrome.extension.getURL('ui/options/icon.png'),
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
		editors.set(branch, editor);
		host.appendChild(editor);
	},
});

options.children.profiles.values.current.forEach(addProfile);

});