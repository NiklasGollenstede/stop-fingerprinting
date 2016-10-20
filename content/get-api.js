'use strict'; try { /* globals browser, */

const utils = window.wrappedJSObject.getPageUtils(this);
Object.assign(this, utils.timers);
browser.page = utils;

} catch (error) { console.error(error); }
