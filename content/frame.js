'use strict'; try { /* globals Components, */

Components.utils.import('resource://stop-fingerprinting/webextension/content/process.jsm', { }).addFrame(this);

} catch (error) {
	Components.utils.import("resource://gre/modules/Console.jsm");
	console.error(error);
}
