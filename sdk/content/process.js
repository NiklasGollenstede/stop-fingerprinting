'use strict'; try { /* globals Components, */

Components.utils.import('resource://stop-fingerprinting/content/process.jsm', { }).reload(); // unloads the module in case it was unable to do so at the last shutdown
Components.utils.import('resource://stop-fingerprinting/content/process.jsm', { }).init(this/*, { webExtId: (new Error).stack.match(/[?&]id=([0-9a-f-]+)(?:$|&|:)/)[1], }*/);

} catch (error) {
	Components.utils.import("resource://gre/modules/Console.jsm");
	console.error(error);
}
