'use strict';
chrome.tabs.create({ url: chrome.extension.getURL('ui/home/index.html'), });
window.close();
