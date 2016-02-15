'use strict';

var { PageMod, } = require('sdk/page-mod');
var { Panel, } = require('sdk/panel');
const Prefs = require('sdk/simple-prefs');
const Config = require('sdk/preferences/service');
const { id: addonName, loadReason, } = require('sdk/self');
const Observers = require('sdk/system/events');
const { when: onUnload } = require('sdk/system/unload');
const fakeAPIs = require('./content.js');
const getExclude = require('./exclude.js');
const { Services } = require('resource://gre/modules/Services.jsm');
const MessageManager = Services.mm;

function log() { console.log.apply(console, arguments); return arguments[arguments.length - 1]; }

let exclude = new RegExp(getExclude(Prefs.prefs.excludeList), 'i');
const include = /(?:^(?:https?|file):\/\/.*$|^about:blank.*$)/i;

function setSyncPref() {
	Config[Prefs.prefs.excludeSync ? 'set' : 'reset'](`services.sync.prefs.sync.extensions.${ addonName }.excludeList`, true);
}

function onGlobalCreated({ subject: window, data, }) {
	const url = window.location.href || data !== 'null' && data;
	if (!url || !include.test(url) || exclude.test(url)) { console.log('skipping "'+ window.location.href +'"'+ (window.location.href ? '' : ' ("'+ data +'")')); return; }
	console.log('faking for "'+ window.location.href +'"'+ (window.location.href ? '' : ' ("'+ data +'")'));
	fakeAPIs(window.wrappedJSObject);
}

// for the main process
Observers.on('content-document-global-created', onGlobalCreated);
onUnload(() => Observers.off('content-document-global-created', onGlobalCreated));

// for content processes
MessageManager.loadFrameScript('resource://stop-fingerprinting/frame.js', true);
MessageManager.addMessageListener('@stop-fingerprinting:get-init-state', () => log('sending state', { exclude: exclude.source, include: include.source, }));
onUnload(() => {
	MessageManager.removeDelayedFrameScript('resource://stop-fingerprinting/frame.js');
	MessageManager.broadcastAsyncMessage('@stop-fingerprinting:destroy');
});

/**
 * TODO: see: https://security.stackexchange.com/questions/102279/can-hsts-be-disabled-in-firefox
 * TODO: Add option to disable WebRTC and geo location API (default: disable)
 * TODO: Add option to enable DNT (default: unchanged)
 */


// TODO: well, this is just ugly ...
Prefs.on(
	'excludeButton',
	() => new Panel({
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
	.port.on('save', data => {
		Prefs.prefs.excludeList = data;
		exclude = new RegExp(getExclude(Prefs.prefs.excludeList), 'i');
		Services.mm.broadcastAsyncMessage('@stop-fingerprinting:state-update', { exclude: exclude.source, });
	})
);

Prefs.on('excludeSync', setSyncPref);
loadReason !== 'startup' && setSyncPref();
console.log('loadReason', loadReason);
