'use strict';

const {
	concurrent: { async, },
	dom: { createElement, },
	format: { Guid },
} = require('es6lib');

const Editor = require('web-ext-utils/options/editor');
const Profile = require('common/profile');

require('common/options').then(options => {

window.options = options;

const deleteProfile = async(function*(id) {
	const host = document.querySelector('#profiles>[data-profile-id="'+ id +'"]');
	host.remove();
	(yield options.profiles.values.splice(options.profiles.values.current.indexOf(id), 1));
	(function reset(options) {
		options.forEach(option => {
			option.values.reset();
			reset(option.children);
		});
	})(host.profile);
});

const addProfile = async(function*(id) {
	if (!id) {
		id = `{${ Guid() }}`;
		(yield options.profiles.values.splice(Infinity, 0, id));
	}
	console.log('addProfile', id);
	const profile = (yield Profile(id));
	const host = document.querySelector('#profiles').appendChild(createElement('div', {
		dataset: { profileId: id, },
	}));
	host.profile = profile;
	Editor({
		options: profile,
		host,
		onCommand({ name, }, value) { ({
			manage: name => ({
				delete: () => deleteProfile(id),
			})[name](),
		})[name](value); },
	});
});

Editor({
	options,
	host: document.querySelector('#options'),
	onCommand({ name, }, value) { ({
		addProfile: () => addProfile(),
	})[name](value); },
});

options.profiles.values.current.forEach(addProfile);

});
