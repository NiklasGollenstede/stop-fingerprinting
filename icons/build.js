'use strict'; /* globals __dirname, __filename, process, module */ // license: MPL-2.0

const icons = {
	default: {
		layers: { background: '', fingerprint: '', stopSign: 'fill: rgba(255, 0, 0, 1)', fingerprintUpper: '', stopText: '', },
		sizes: [ 16, 19, 32, 38, 48, 64, 128, 256, 1024, ],
	},
	changed: {
		layers: { background: '', fingerprint: '', stopSign: 'fill: rgba(187, 0, 255, 1)', fingerprintUpper: '', stopText: '', },
		sizes: [ 19, 38, 128, ],
	},
	error: {
		layers: { background: '', fingerprint: '', errorTriangle: 'fill: #E60000', },
		sizes: [ 256, ],
	},
	info: {
		layers: { background: '', fingerprint: '', infoCircle: 'fill: hsla(212, 68%, 51%, 0.86)', },
		sizes: [ 256, ],
	},
	log: {
		layers: { background: '', fingerprint: '', },
		sizes: [ 256, ],
	},
	debug: {
		layers: { background: '', fingerprint: 'opacity: 0.6', bugIcon: 'fill: #e21', },
		sizes: [ 256, ],
	},
	options: {
		layers: { gearIcon: 'fill: #7A7DB9', },
		sizes: [ 96, ],
	},
	state: {
		layers: { cardiogram: 'fill: #5AE25A', },
		sizes: [ 96, ],
	},
	issues: {
		layers: { bugIcon: 'fill: #F07451', },
		sizes: [ 96, ],
	},
	about: {
		layers: { infoCircle: 'fill: hsla(212, 68%, 51%, 1)', },
		sizes: [ 96, ],
	},
	chrome: {
		layers: { chromeIcon: '', },
		sizes: [ 96, ],
	},
	firefox: {
		layers: { firefoxIcon: '', },
		sizes: [ 96, ],
	},
};

const {
	concurrent: { async, promisify, spawn, },
	fs: { FS, Path: { resolve, }, },
	functional: { log, },
} = require('es6lib');

const relative = (...parts) => resolve(__dirname, ...parts);

const convert = promisify(require('svgexport').render);

const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');

const build = module.exports = async(function*(names = Object.keys(icons)) {

	const template = relative('template.svg');
	(yield Promise.all(names.map(writeSvg)));
	return names;

	function writeSvg(name) {
		const icon = icons[name];
		const css = '.layer { display: none !important; }\n'
		+ Object.keys(icon.layers).map(layer => '#'+ layer +'{ display: initial !important; '+ icon.layers[layer].split(';').join(' !important; ') +' !important; }').join('\n');
		return convert({
			input: [ template, css, ],
			output: icon.sizes.map(size => [ relative(name, size +'.png'), size +':', ]),
		}).then(() => imagemin(
			[ relative(name, '*.png'), ],
			relative(name),
			{ use: [ imageminPngquant(), ], }
		));
	}
});

if (process.argv[1] === __filename) {
	build(process.argv.length > 2 ? process.argv.slice(2) : Object.keys(icons))
	.then(names => console.log('icons created: "'+ names.join('", "') +'"'))
	.catch(error => { console.error(error); process.exit(-1); });
}
