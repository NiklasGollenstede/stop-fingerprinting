(function() { 'use strict'; try { /* globals browser, */

if (document.body) { return; } // the page already had a chance to load run code, abort here. (error handling is done in index.js)

const utils = window.wrappedJSObject.getPageUtils(this);
Object.assign(this, utils.timers);
browser.page = utils;

} catch (error) { console.error(error); } })();
