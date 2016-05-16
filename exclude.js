'use strict'; /* global module */

/**
 * This module manages the site exclude list: loads it when first requested, rebuilds and broadcasts it when it changes and opens the panel to edit it.
 */

const { Panel, } = require('sdk/panel');
const Prefs = require('sdk/simple-prefs');
const { storage: Storage, } = require('sdk/simple-storage');
const { Services } = require('resource://gre/modules/Services.jsm');

const nothing = '^(?!x)x$';
let currentSource = nothing;
let currentRegExp = new RegExp(nothing);


const self = module.exports = {

	get regExp() {
		return currentRegExp;
	},

	get source() {
		return currentSource;
	},

	edit() {
		new Panel({
			contentScriptOptions: Prefs.prefs.excludeList || '',
			contentScript: '('+ function() {
				document.querySelector('textarea').value = self.options;
				self.port.on('hide', () => {
					self.port.emit('save', document.querySelector('textarea').value);
				});
			} +')()',
			contentURL: 'data:text/html;charset=utf-8,<html><head></head><body><textarea style="height: calc(100vh - 20px); width: calc(100vw - 20px);"></textarea></body></html>',
			width: 650,
			height: 600,
			onHide() {
				this.port.emit('hide');
			},
		})
		.show()
		.port.on('save', data => Prefs.prefs.excludeList = data);
	},

	_init() {
		currentSource = Storage.parsedExcludes || self._rebuild();
		return currentRegExp = new RegExp(currentSource, 'i');
	},

	_rebuild() {
		Storage.parsedExcludes = currentSource = self._parse(Prefs.prefs.excludeList);

		Services.mm.broadcastAsyncMessage('@stop-fingerprinting:state-update', { exclude: currentSource, });

		return currentRegExp = new RegExp(currentSource, 'i');
	},

	_parse(input) {
		const fromString = string => '^' + string
		.replace(/[\\\.\(\)\{\}\[\]\?\|\^\$]/g, c => '\\'+ c) // escape for RegExp
		.replace(/^((https?|file):\/\/)?/i, ($0, $1) => $1 || 'https?://') // enforce https?:// || http:// || https://
		.replace('*', '.*') // convert wildcard
		.replace(/(\/)?$/, ($0, $1) => $1 ? '\/?$' : '.*$'); // end at slach or fill with .*

		const fromRegExp = string => '^' + string
		.replace(/^\//g, '') // remove starting slash
		.replace(/^\^/, '') // match from start
		.replace(/^((\\?h\\?t\\?t\\?p(\\?s\??)?\\?|\\?f\\?i\\?l\\?e)\\?:\\?\/\\?\/)?/i, ($0, $1) => $1 || 'https?://') // enforce https?:// || http:// || https:// || file:// (where each character may be escaped)
		.replace(/\\*\$?\\*$/, '$'); // match to end, making shure the '$' is not escaped

		const lines = (input || '')
		.split(/\s*[\n\r]+\s*/)
		.filter(line => line && !(/^[#;]/).test(line))
		.map(line => (/^\//).test(line) ? fromRegExp(line) : fromString(line))
		.filter(x => x);

		const excludes = lines.length ? '(?:'+ lines.join(')|(?:') +')' : nothing;

		return excludes;
	},

};

Prefs.on('excludeList', self._rebuild);
