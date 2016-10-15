'use strict';

const webExtension = require('sdk/webextension');

webExtension.startup().then(({ browser: { runtime }, }) => {
	runtime.onMessage.addListener(m => console.log('message', m));
});
