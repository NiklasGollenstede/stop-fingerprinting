((global) => { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/dom': { createElement, },
	'node_modules/es6lib/string': { Guid, },
	'node_modules/web-ext-utils/browser/': { extension: { getURL, }, },
	'node_modules/web-ext-utils/tabview/': TabView,
	'node_modules/web-ext-utils/options/editor/': Editor,
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	'common/profile-data': ProfileData,
}) => async ({ document: { body, }, }) => {

const profiles = global.profiles = { };

async function deleteProfile(profile) { try {
	const id = profile.children.id.value;
	(await profile.resetAll());
	(await options.profiles.values.splice(options.profiles.values.current.indexOf(id), 1));
	tabs.active = 'options';
	tabs.remove(id);
	editors.delete(profile);
	delete profiles[id];
} catch (error) { reportError(error); } }

async function addProfile(id) { try {
	const created = !id;
	if (created) {
		id = `{${ Guid() }}`;
		(await options.profiles.values.splice(Infinity, 0, id));
	}
	const profile = (await ProfileData(id));
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
	profiles[id] = profile;
} catch (error) { reportError(error); } }

function onCommand(branch, { name, }, value) { ({
	addProfile: () => addProfile(),
	manage: name => ({
		delete: () => deleteProfile(branch),
	})[name](),
})[name](value); }

const editors = new Map;

const tabs = new TabView({
	host: body,
	content: createElement('div', {style: {
		padding: '10px', overflowY: 'scroll',
	}, }),
	active: 'options',
	style: 'horizontal firefox',
	tabs: [
		{
			id: 'options',
			title: 'General',
			icon: getURL('icons/options/96.png'),
			data: { branch: options, },
		},
	],
	onSelect({ data: { branch, }, }) {
		const host = this.content;
		host.textContent = '';
		let editor = editors.get(branch);
		if (editor) { return void host.appendChild(editor); }
		editor = host.appendChild(createElement('div'));
		new Editor({
			options: branch,
			host: editor,
			onCommand: onCommand.bind(null, branch),
		});
		editors.set(branch, editor);
	},
});

(await addProfile('<default>'));

(await Promise.all(options.profiles.values.current.map(addProfile)));

}); })(this);
