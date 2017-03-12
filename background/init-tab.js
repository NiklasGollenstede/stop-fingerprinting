(async function(global) { 'use strict'; // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
const { location, browser, } = global;

const main = browser.extension.getBackgroundPage();
if (main) { return void main.initView(global); }

const options = new global.URLSearchParams(location.hash.split('?')[1]);
const tabId = +options.get('tabId');
const url = decodeURIComponent(options.get('url'));

const ctxId = (await global.getCtxId(tabId));
(await browser.runtime.sendMessage([ 'inittab', 1, [ tabId, ctxId, ], ]));
global.location.replace(url);

})(this);
