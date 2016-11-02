(function(global) { 'use strict'; try { /* globals browser, cloneInto, exportFunction, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const __dirname = 'resource://stop-fingerprinting/webextension/content';

if (document.body) { return; } // TODO: this should actually never happen, but it does when the extension is installed/reloaded.
// I don't think that is intended behaviour. This line should be removed (once the reload behaviour is solved)!

const { files, } = global;

const Messages = new global.es6lib_port(browser, global.es6lib_port.web_ext_Runtime);

const { page, page: { utils, }, } = browser;
utils.cloneInto = cloneInto; utils.exportFunction = exportFunction;

// pause the page untill startDone() gets called.
const startDone = (token => () => page.resume(token))(page.pause());

spawn(function*() {
	const tabData = (yield Messages.request('getSenderProfile', window.opener && window.opener.document.URL));
	if (!tabData) { console.log('profile is null'); return; } // no profile available for this tab yet. This is not an error
	const {
		profile,
		changed: profileChanged, // whether this profile is a different one than on the last page load
		pageLoadCount, // number of pages loaded in this tab, starting ta 1
		includes: includeRegExpSource, // RegExp of (url.origin || url.href) that share their origin with the current page
	} = tabData;
	if (profile.disabled) { console.log('profile is disabled'); return; } // never mind ...

	console.log('got profile', profile.nonce, tabData);
	const includeRegExp = new RegExp(includeRegExpSource);

	page.onDOMWindowCreated.addListener(injectInto);
	injectInto(window);


	function injectInto(cw) { try {
		const ucw = cw.wrappedJSObject;
		if (!profile) { return; }

		const sandbox = utils.makeSandboxFor(cw);

		const exportFunction = func => utils.exportFunction(func, ucw, { allowCrossOriginArguments: true, });
		const cloneInto = obj => utils.cloneInto(obj, ucw, { cloneFunctions: false, }); // expose functions only explicitly through exportFunction
		const needsCloning = obj => obj !== null && typeof obj === 'object' && utils.getGlobalForObject(obj) !== ucw; // TODO: test
		const originIncludes = url => (url = new URL(url, cw.location)) && url.origin === 'null' ? includeRegExp.test(url.href) : includeRegExp.test(url.origin);

		sandbox.console = console;
		sandbox.handleCriticalError = exportFunction(handleCriticalError.bind(this));
		sandbox.profile = cloneInto(profile);
		sandbox.isMainFrame = cw === window;
		sandbox.profileChanged = profileChanged;
		sandbox.pageLoadCount = pageLoadCount;
		sandbox.exportFunction = exportFunction(exportFunction);
		sandbox.cloneInto = exportFunction(cloneInto);
		sandbox.needsCloning = exportFunction(needsCloning);
		sandbox.originIncludes = exportFunction(originIncludes);
		sandbox.sandbox = sandbox;
		sandbox.ucw = ucw;

		const exec = ({ content, name, offset, }) => utils.evalInSandbox(
			content, sandbox, 'latest',
			__dirname +'/'+ name +'?'+ profile.nonce, // the nonce is needed to create unpredictable error stack fames that can be filtered
			offset + 1
		);

		exec(files['globals.js']);
		Object.keys(files.fake).forEach(key => exec(files.fake[key]));
		exec(files['apply.js']);

		// TODO: there are cases (the first load in a new using Crl+Click) where the direct window. properties
		// are overwritten/not applied, but those on other objects (e.g. Screen.ptt) work

		if (profile.debug) { // TODO: remove
			ucw.profile = cloneInto(profile);
			ucw.apis = sandbox.apis;
		}
		console.log('injection done', profile.debug);
	} catch (error) {
		handleCriticalError(error, `Failed to inject code`);
	} }

})
.catch(error => handleCriticalError(error, `Failed to load profile`))
.then(startDone)
.catch(error => console.error(error));

function handleCriticalError(error, message, rethrow) {
	message || (message = (error && error.message || '') + '');
	const resume = confirm(message.replace(/[!?.]?$/, _=>_ || '.') +`\nResume navigation?`);
	if (!resume) {
		page.pause();
		window.stop();
		document.documentElement && document.documentElement.remove();
		if (rethrow) { throw error; }
	}
	console.error(message, error);
	return resume;
}

function spawn(generator) {
	const iterator = generator();
	const next = arg => handle(iterator.next(arg));
	const _throw = arg => handle(iterator.throw(arg));
	const handle = ({ done, value, }) => done ? Promise.resolve(value) : Promise.resolve(value).then(next, _throw);
	return Promise.resolve().then(next);
}

} catch (error) {
	console.error(error);
	alert(`Stop Fingerprinting totally failed, please try to reload or close the tab.\nIf you ignore this message Stop Fingerprinting won't be able to protect your privacy!`);
} })((function() { return this; })());
