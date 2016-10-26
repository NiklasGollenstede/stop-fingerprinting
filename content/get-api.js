(function(global) { 'use strict'; try { /* globals browser, */

if (document.body) { return; } // the page already had a chance to load run code, abort here. (error handling is done in index.js)

const utils = window.wrappedJSObject.getPageUtils(global);
Object.assign(global, utils.timers);
browser.page = utils;

} catch (error) { console.error(error); } })((function() { /* jshint strict: false */ return this; })());
