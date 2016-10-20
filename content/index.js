(function(global) { 'use strict'; /* globals browser, cloneInto, exportFunction, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const __dirname = 'resource://stop-fingerprinting/webextension/content';

const { files, } = global;

const Messages = new global.es6lib_port(browser, global.es6lib_port.web_ext_Runtime);

const { page, page: { utils, }, } = browser;
utils.cloneInto = cloneInto; utils.exportFunction = exportFunction;

// pause the page untill startDone() gets called.
const startDone = (token => () => page.resume(token))(page.pause());

spawn(function*() {
	const profile = (yield Messages.request('getSenderProfile'));
	const { tabId, } = profile;

	console.log('got tabId', tabId);

	page.onDOMWindowCreated.addListener(injectInto);
	injectInto(window);


	function injectInto(cw) { try {
		const ucw = utils.waiveXrays(cw);
		if (!profile) { return; }

		const sandbox = utils.makeSandboxFor(cw);

		const exportFunction = func => utils.exportFunction(func, ucw, { allowCrossOriginArguments: true, });
		const cloneInto = obj => utils.cloneInto(obj, ucw, { cloneFunctions: false, }); // expose functions only explicitly through exportFunction
		const needsCloning = obj => obj !== null && typeof obj === 'object' && utils.getGlobalForObject(obj) !== ucw; // TODO: test

		sandbox.console = console; // utils.cloneInto(console, ucw, { cloneFunctions: true, });
		sandbox.handleCriticalError = exportFunction(handleCriticalError.bind(this));
		sandbox.profile = cloneInto(profile);
		sandbox.isMainFrame = cw === window;
		sandbox.exportFunction = exportFunction(exportFunction);
		sandbox.cloneInto = exportFunction(cloneInto);
		sandbox.needsCloning = exportFunction(needsCloning);
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

		ucw.profile = cloneInto(profile); // TODO: remove
		console.log('injection done');
	} catch (error) {
		handleCriticalError(error, `Failed to inject code`);
	} }

})
.catch(error => handleCriticalError)
.then(startDone)
.catch(error => console.error(error));

function handleCriticalError(error, message, rethrow) {
	message || (message = (error && error.message || '') + '');
	const resume = confirm(message.replace(/[!?.]$/, _=>_ || '.') +`\nResume navigation?`);
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

})((function() { return this; })());
