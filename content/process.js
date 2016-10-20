'use strict'; try { /* globals Components, */

Components.utils.import('resource://stop-fingerprinting/webextension/content/process.jsm', { }).reload();
Components.utils.import('resource://stop-fingerprinting/webextension/content/process.jsm', { }).init(this);

} catch (error) {
	Components.utils.import("resource://gre/modules/Console.jsm");
	console.error(error);
}
