(function(global) { 'use strict'; try { /* globals browser, */

if (document.readyState !== 'loading') { return; } // the page already had a chance to load run code, abort here. (error handling is done in index.js)

const utils = window.wrappedJSObject.getPageUtils(global);
Object.assign(global, utils.timers);
browser.page = utils;

} catch (error) { console.error(error); } })((function() { /* jshint strict: false */ return this; })());
