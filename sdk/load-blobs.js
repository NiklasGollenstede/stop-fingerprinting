'use strict'; /* globals module, */ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const { Cu, } = require('chrome');
const self = require('sdk/self');
Cu.importGlobalProperties([ 'URL', 'Blob', ]); /* globals URL, Blob, */

const { _async, } = require('./webextension/node_modules/es6lib/concurrent.js');
const { HttpRequest, mimeTypes, } = require('./webextension/node_modules/es6lib/network.js');

const paths = [
	'fonts/Bell_MT/nn.woff2',
];

module.exports = _async(function*() {
	const blobs = (yield Promise.all(paths.map(path => HttpRequest({
		url: self.data.url('../blob/'+ path),
		responseType: 'blob',
		overrideMimeType: mimeTypes[path.split('.').pop()],
	})))).map(_=>_.response);

	const files = { };
	for (let i = 0; i < paths.length; ++i) {
	 	files[paths[i]] = {
	 		type: blobs[i].type,
	 		url: URL.createObjectURL(blobs[i]),
	 	};
	}

	console.log('files', files, blobs);
	return files;
});
