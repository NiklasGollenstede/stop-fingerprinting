'use strict';

require('background/options').then(options => {
	require('web-ext-utils/options/editor')({
		options, host: document.querySelector('#options'),
	});
});
