'use strict';
chrome.tabs.create({ url: chrome.extension.getURL('ui/options/index.html'), });
window.close();
