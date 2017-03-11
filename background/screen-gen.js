(function(global) { 'use strict'; const factory = function screen_gen(exports) { // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

/**
 * data (width, height, comments) from: https://en.wikipedia.org/wiki/List_of_common_resolutions and https://en.wikipedia.org/wiki/Display_resolution
 * @license CC BY-SA 3.0
 */
const resolutions = [
	{ parts:  4, width: 1024, height:  600, }, // WSVGA
	{ parts:  1, width: 1136, height:  640, }, // Apple iPhone 5 (Retina display)
	{ parts: 40, width: 1024, height:  768, }, // Common on 14″/15″ TFTs and the Apple iPad (XGA)
	{ parts:  1, width: 1024, height:  800, }, // Sun-1 monochrome
	{ parts:  1, width: 1152, height:  768, }, // Apple PowerBook G4 (original Titanium version)
	{ parts: 10, width: 1280, height:  720, }, // 720p (WXGA-H, min.)
	{ parts:  1, width: 1120, height:  832, }, // NeXT MegaPixel Display
	{ parts:  1, width: 1280, height:  768, }, // Wide XGA avg., BrightView (WXGA)
	{ parts:  3, width: 1152, height:  864, }, // Apple XGA[note 2] (XGA+)
	{ parts:  1, width: 1334, height:  750, }, // Apple iPhone 6
	{ parts:  4, width: 1280, height:  768, }, // Wide XGA max. (WXGA)
	{ parts: 30, width: 1280, height:  800, }, // Wide XGA max. (WXGA)
	{ parts:  1, width: 1152, height:  900, }, // Sun-2 Prime Monochrome or Color Video, also common in Sun-3 and Sun-4 workstations
	{ parts:  1, width: 1024, height: 1024, }, // Network Computing Devices
	{ parts: 15, width: 1360, height:  768, }, // standardized HDTV 720p/1080i displays or “HD ready”, used in most cheaper notebooks
	{ parts:150, width: 1366, height:  768, }, // standardized HDTV 720p/1080i displays or “HD ready”, used in most cheaper notebooks
	{ parts:  1, width: 1280, height:  854, }, // Apple PowerBook G4
	{ parts:  1, width: 1600, height:  768, }, // Sony VAIO P series
	{ parts:  1, width: 1280, height:  960, }, // (SXGA−)
	{ parts:  1, width: 1440, height:  900, }, // Wide SXGA or Wide XGA+ (WSXGA)
	{ parts: 25, width: 1280, height: 1024, }, // (SXGA)
	{ parts:  1, width: 1440, height:  960, }, // Apple PowerBook G4
	{ parts: 30, width: 1400, height:  900, }, // WXGA+
	{ parts: 30, width: 1600, height:  900, }, // 900p (HD+)
	{ parts:  1, width: 1400, height: 1050, }, // (SXGA+)
	{ parts:  1, width: 1440, height: 1024, }, // similar to A4 paper format (~123 dpi for A4 size)
	{ parts:  1, width: 1440, height: 1080, }, // HDV 1080i
	{ parts:  1, width: 1600, height: 1024, }, // SGI 1600SW
	{ parts: 15, width: 1680, height: 1050, }, // (WSXGA+)
	{ parts:  1, width: 1776, height: 1000, }, // available in some monitors
	{ parts:  1, width: 1600, height: 1200, }, // (UXGA)
	{ parts:  1, width: 1600, height: 1280, }, // Sun3 Hi-res monochrome
	{ parts:300, width: 1920, height: 1080, }, // HD 1080 (1080i, 1080p), FullHD (FHD)
	{ parts:  7, width: 1920, height: 1200, }, // (WUXGA)
	{ parts:  1, width: 1920, height: 1280, }, // Microsoft Surface 3 (Full HD Plus)
	{ parts:  1, width: 2048, height: 1152, }, // 2K (QWXGA)
	{ parts:  1, width: 1792, height: 1344, }, // (supported by some GPUs, monitors, and games)
	{ parts:  1, width: 1856, height: 1392, }, // (supported by some GPUs, monitors, and games)
	{ parts:  1, width: 2880, height:  900, }, // NEC CRV43,[12] Ostendo CRVD,[13] Alienware Curved Display[14][15] (CWSXGA)
	{ parts:  1, width: 1800, height: 1440, }, // (supported by some GPUs, monitors, and games)
	{ parts:  1, width: 2048, height: 1280, }, // (supported by some GPUs, monitors, and games)
	{ parts:  1, width: 1920, height: 1400, }, // Tesselar XGA (TXGA)
	{ parts:  1, width: 2538, height: 1080, }, // Avielo Optix SuperWide 235 projector[16]
	{ parts:  1, width: 2560, height: 1080, }, // Cinema TV from Philips and Vizio, Dell UltraSharp U2913WM, ASUS MX299Q, NEC EA294WMi, Philips 298X4QJAB, LG 29EA93, AOC Q2963PM
	{ parts:  1, width: 1920, height: 1440, }, // (supported by some GPUs, monitors, and games)
	{ parts:  1, width: 2160, height: 1440, }, // Microsoft Surface Pro 3
	{ parts:  1, width: 2048, height: 1536, }, // iPad (3rd Generation) QXGA
	{ parts:  1, width: 2304, height: 1440, }, // Maximum resolution of the Sony GDM-FW900, Hewlett Packard A7217A and the 2015 Retina Display MacBook
	{ parts: 10, width: 2560, height: 1440, }, // Dell UltraSharp U2711, Dell XPS One 27, Apple iMac (QHD)
	{ parts:  1, width: 2304, height: 1728, }, // (selectable on some displays and graphics cards[17][unreliable source?][18])
	{ parts:  1, width: 2560, height: 1600, }, // Apple Cinema HD 30, Dell Ultrasharp U3011, Dell 3007WFP, Dell 3008WFP, Gateway XHD3000, Samsung 305T, HP LP3065, HP ZR30W, Nexus 10 (WQXGA)
	{ parts:  1, width: 2560, height: 1700, }, // Chromebook Pixel
	{ parts:  1, width: 2560, height: 1800, }, // Pixel C
	{ parts:  1, width: 2560, height: 1920, }, // (max. CRT resolution. Supported by the Viewsonic P225f and some graphics cards)
	{ parts:  3, width: 3440, height: 1440, }, // LG UltraWide 34UM95
	{ parts:  1, width: 2736, height: 1824, }, // Microsoft Surface Pro 4
	{ parts:  1, width: 2880, height: 1800, }, // Apple 15\"MacBook Pros Retina Display
	{ parts:  1, width: 2560, height: 2048, }, // (QSXGA)
	{ parts:  1, width: 2732, height: 2048, }, // iPad Pro
	{ parts:  1, width: 2800, height: 2100, }, // (QSXGA+)
	{ parts:  1, width: 3200, height: 1800, }, // HP Envy TouchSmart 14, Fujitsu Lifebook UH90/L, Lenovo Yoga 2 Pro (WQXGA+)
	{ parts:  1, width: 3000, height: 2000, }, // Microsoft Surface Book
	{ parts:  1, width: 3200, height: 2048, }, // (WQSXGA)
	{ parts:  1, width: 3200, height: 2400, }, // (QUXGA)
	{ parts: 10, width: 3840, height: 2160, }, // 2160p (4K UHD)
	{ parts:  1, width: 3840, height: 2400, }, // (IBM T221 WQUXGA)
	{ parts:  1, width: 4096, height: 2304, }, // (4K)
	{ parts:  1, width: 5120, height: 2160, }, // (21:9 aspect ratio TVs, 5K)
	{ parts:  1, width: 4096, height: 3072, }, // (HXGA)
	{ parts:  1, width: 5120, height: 2880, }, // (Dell UP2715K, Apple 27\" iMac 5K Retina Display (UHD+))
	{ parts:  1, width: 5120, height: 3200, }, // (WHXGA)
	{ parts:  1, width: 5120, height: 4096, }, // (HSXGA)
	{ parts:  1, width: 6400, height: 4096, }, // (WHSXGA)
	{ parts:  1, width: 6400, height: 4800, }, // (HUXGA)
	{ parts:  1, width: 7680, height: 4320, }, // 4320p (8K UHD)
	{ parts:  1, width: 7680, height: 4800, }, // (WHUXGA)
	{ parts:  1, width: 8192, height: 4608, }, // (8K)
	{ parts:  1, width: 8192, height: 8192, }, // (8K Fulldome)
];
resolutions.forEach(res => res.ratio = res.width / res.height);

const devicePixelRatios = [
	{ parts:   1, value: 0.50, },
	{ parts:   1, value: 0.75, },
	{ parts: 100, value: 1.00, },
	{ parts:  15, value: 1.25, },
	{ parts:  20, value: 1.50, },
	{ parts:   5, value: 1.75, },
	{ parts:  20, value: 2.00, },
	{ parts:   1, value: 2.25, },
	{ parts:   1, value: 2.50, },
	{ parts:   1, value: 2.75, },
	{ parts:   1, value: 3.00, },
	{ parts:   1, value: 4.00, },
	{ parts:   1, value: 5.00, },
	{ parts:   1, value: 6.00, },
	{ parts:   1, value: 7.00, },
	{ parts:   1, value: 8.00, },
];

const offsets = [
	{ parts: 10, value:   0, },
	{ parts:  1, value:   8, },
	{ parts:  1, value:  16, },
	{ parts:  2, value:  24, },
	{ parts:  3, value:  32, },
	{ parts:  1, value:  48, },
	{ parts:  3, value:  20, },
	{ parts:  1, value:  30, },
	{ parts:  8, value:  40, },
	{ parts:  3, value:  50, },
];

class ScreenGenerator {

	/**
	 * Creates a new ScreenGenerator that produces screen obejcts according to `config`.
	 * @param  {object}  config                     Optional. Configuration object that restricts the possible values of the generated screens' properties:
	 * @param  {Range}   config.width               Optional. Restricts the values of the screen's .width (picked from `resolutions`). Defaults to no restriction.
	 * @param  {Range}   config.height              Optional. Restricts the values of the screen's .height (picked from `resolutions`). Defaults to no restriction.
	 * @param  {Range}   config.ratio               Optional. Restricts the possible ratio of the screen's .width/.height (picked from `resolutions`). Defaults to no restriction.
	 * @param  {Range}   config.devicePixelRatio    Optional. Restricts the values of the screen's .devicePixelRatio (picked from `devicePixelRatios`). Defaults to no restriction.
	 * @param  {object}  config.offset              Optional. Object of `top`, `right`, `bottom` and `left` Ranges that restrict the offset of the `avail` screen area
	 *                                              (The area that is not reserved for task/menu/... bar). Defaults to { from: 30, to: 50, } at the bottom and 0 elsewhere.
	 * @throws {RangeError}   If `config` is to restrictive to allow any of the values in the lists above.
	 */
	constructor(config = { }) {
		this.ratio = parseRange(config.ratio, { from: 0, to: Infinity, });
		this.width = parseRange(config.width, { from: 0, to: Infinity, });
		this.height = parseRange(config.height, { from: 0, to: Infinity, });
		this.resolutions = resolutions.filter(({ ratio,  width, height, }) => isIn(ratio, this.ratio) && isIn(width, this.width) && isIn(height, this.height));
		if (!this.resolutions.length) { throw new RangeError('The filters don\'t allow any resolutions'); }

		const dprRange = parseRange(config.devicePixelRatio, { from: 1, to: 1.5, });
		this.devicePixelRatios = devicePixelRatios.filter(({ value, }) => isIn(value, dprRange));
		if (!this.devicePixelRatios.length) { throw new RangeError('The devicePixelRatio range is invalid'); }

		[ 'top', 'right', 'bottom', 'left', ].forEach(offset => {
			const range = parseRange(config.offset && config.offset[offset], offset === 'bottom' ? { from: 30, to: 50, } : { from: 0, to: 0, });
			this[offset] = offsets.filter(({ value, }) => isIn(value, range));
			if (!this[offset].length) { throw new RangeError('The '+ offset +' offset range is invalid'); }
		});
	}
	screen() {
		const { width, height, } = chooseWeightedRandom(this.resolutions);
		const dpr = chooseWeightedRandom(this.devicePixelRatios).value;
		const top = chooseWeightedRandom(this.top).value;
		const right = chooseWeightedRandom(this.right).value;
		const bottom = chooseWeightedRandom(this.bottom).value;
		const left = chooseWeightedRandom(this.left).value;
		return {
			top: 0, left: 0,
			availTop: top / dpr,
			availLeft: left / dpr,
			height: height / dpr,
			width: width / dpr,
			availHeight: (height - top - bottom) / dpr,
			availWidth: (width - right - left) / dpr,
			colorDepth: 24, pixelDepth: 24,
			// orientation: , // TODO
			devicePixelRatio: dpr,
		};
	}
	generate() {
		return this.screen();
	}
}
ScreenGenerator.keys = [ 'top', 'left', 'height', 'width', 'colorDepth', 'availTop', 'availLeft', 'availHeight', 'availWidth', 'pixelDepth', 'devicePixelRatio', ];

function isIn(value, range) {
	return value >= range.from && value <= range.to;
}

function parseRange(arg, def) {
	if (arg == null) { return def; }
	if (typeof arg === 'object') {
		const array = Array.isArray(arg);
		let from = array ? arg[0] : 'from' in arg ? arg.from : arg.to || 0;
		let to = array ? arg[1] : 'to' in arg ? arg.to : arg.from || 0;
		if (to < from) { let tmp = from; from = to; to = tmp; }
		return { from, to, };
	}
	return { from: +arg || 0, to: +arg || 0, };
}

function chooseWeightedRandom(array) {
	addTotalParts(array);
	let r = Math.random() * array.total_parts << 0;
	return array.find(({ parts, }) => (r -= parts) <= 0);
}

function addTotalParts(array) {
	if (array.total_parts) { return; }
	array.total_parts = array.reduce((sum, { parts, }) => sum + parts, 0);
}

return (ScreenGenerator.ScreenGenerator = ScreenGenerator);

}; if (typeof define === 'function' && define.amd) { define([ 'exports', ], factory); } else { const exp = { }, result = factory(exp) || exp; if (typeof exports === 'object' && typeof module === 'object') { module.exports = result; } else { global[factory.name] = result; } } })((function() { return this; })());
