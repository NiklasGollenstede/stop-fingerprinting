'use strict';

/**
 * TODO: Also handle Workers: apparently there is no direct API to do this, so: catch url in constructor and append code to response from that url (?)
 * TODO: Also handle BroadcastChannels
 * TODO: see: https://security.stackexchange.com/questions/102279/can-hsts-be-disabled-in-firefox
 * TODO: Add option to disable WebRTC and geo location API (default: disable)
 * TODO: Add option to enable DNT (default: unchanged)
 * TODO: Add option to set HTTP_ACCEPT (default: unchanged)
 */

const { PageMod, } = require('sdk/page-mod');
const { Panel, } = require('sdk/panel');
const Prefs = require('sdk/simple-prefs');
const Config = require('sdk/preferences/service');
const Self = require('sdk/self');
const Observers = require('sdk/system/events');
const { when: onUnload } = require('sdk/system/unload');
const fakeAPIs = require('./content.js');
const Exclude = require('./exclude.js');
const { Services } = require('resource://gre/modules/Services.jsm');
const MessageManager = Services.mm;
const addonName = Self.id.replace(/^@/, '');

const include = /(?:^(?:https?|file):\/\/.*$|^about:blank.*$)/i;

// catch window creations in the main process
Observers.on('content-document-global-created', onGlobalCreated);
onUnload(() => Observers.off('content-document-global-created', onGlobalCreated));
function onGlobalCreated({ subject: window, data, }) {
	const url = window.location.href || data !== 'null' && data;
	if (!url || !include.test(url) || Exclude.regExp.test(url)) { /*console.log('skipping "'+ window.location.href +'"'+ (window.location.href ? '' : ' ("'+ data +'")'));*/ return; }
	/*console.log('faking for "'+ window.location.href +'"'+ (window.location.href ? '' : ' ("'+ data +'")'));*/
	fakeAPIs(window.wrappedJSObject);
}

// catch window creations in content processes
MessageManager.addMessageListener(`@${ addonName }:get-init-state`, () => ({ exclude: Exclude.source, include: include.source, }));
MessageManager.loadFrameScript(`resource://${ addonName }/frame.js`, true);
onUnload(() => {
	MessageManager.removeDelayedFrameScript(`resource://${ addonName }/frame.js`);
	MessageManager.broadcastAsyncMessage(`@${ addonName }:destroy`);
});

// respond to preference changes
Prefs.on('excludeButton', Exclude.edit);
Prefs.on('excludeSync', setSyncPref);

function setSyncPref() {
	Config[Prefs.prefs.excludeSync ? 'set' : 'reset'](`services.sync.prefs.sync.extensions.@${ addonName }.excludeList`, true);
}

Self.loadReason !== 'startup' && setSyncPref();
