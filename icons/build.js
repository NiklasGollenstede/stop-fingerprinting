'use strict'; /* global __dirname */

const {
	concurrent: { async, promisify, spawn, },
	fs: { FS, Path: { resolve, }, },
	functional: { log, },
} = require('es6lib');

const relative = (...parts) => resolve(__dirname, ...parts);

const convert = promisify(require('svgexport').render);

const icons = {
	default: {
		layers: [ 'fingerprint', 'stopSign', ],
		sizes: [ 16, 18, 38, 48, 64, 128, 256, ],
	},
	error: {
		layers: [ 'fingerprint', 'errorTriangle', ],
		sizes: [ 256, ],
	},
	info: {
		layers: [ 'fingerprint', 'infoCircle', ],
		sizes: [ 256, ],
	},
};


const imagemin = require('imagemin');
const pngout = require('imagemin-pngout');
const imageminPngquant = require('imagemin-pngquant');

spawn(function*() {
	const template = relative('template.svg');
	(yield Promise.all(Object.keys(icons).map(writeSvg)));

	console.log('all icons created');

	function writeSvg(name) {
		const icon = icons[name];
		const css = (`.layer { display: none !important; } #background${ icon.layers.map(s => ', #'+ s).join('') } { display: initial !important; }`);
		return convert({
			input: [ template, css, ],
			output: icon.sizes.map(size => [ relative(name, size +'.png'), size +':', ]),
		}).then(() => imagemin(
			[ relative(name, '*.png'), ],
			relative(name),
			{ use: [ imageminPngquant(), ], }
		));
	}
}).catch(error => console.error(error));

