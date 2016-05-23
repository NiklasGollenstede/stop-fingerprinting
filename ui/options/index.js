'use strict';

const {
	concurrent: { async, },
	dom: { createElement, },
	format: { Guid },
} = require('es6lib');

const Editor = require('web-ext-utils/options/editor');
const Tabs = require('web-ext-utils/tabview');
const Profile = require('common/profile');

require('common/options').then(options => {

window.options = options;

const deleteProfile = async(function*(profile) {
	(yield options.profiles.values.splice(options.profiles.values.current.indexOf(profile.id.value), 1));
	(function reset(options) {
		options.forEach(option => {
			option.values.reset();
			reset(option.children);
		});
	})(profile);
	tabs.active = 'options';
	tabs.remove(profile.id.value);
	editors.delete(profile);
});

const addProfile = async(function*(id) {
	let created = false;
	if (!id) {
		id = `{${ Guid() }}`;
		(yield options.profiles.values.splice(Infinity, 0, id));
		created = true;
	}
	console.log('addProfile', id);
	const profile = (yield Profile(id));
	tabs.add({
		id,
		data:  { branch: profile, },
	});
	profile.title.whenChange(title => {
		tabs.set({ id, title, });
	});
	created && (tabs.active = id);
});

function onOptionCommand({ name, }, value) {
	({
		addProfile: () => addProfile(),
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

options.profiles.values.current.forEach(addProfile);

});
