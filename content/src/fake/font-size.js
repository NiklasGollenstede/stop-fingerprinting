/* globals
	define, makeGetter,
	call, round, ceil, log2, pow, random, MAX_SAFE_INTEGER,
	Element_p_get_clientHeight,
	Element_p_get_clientWidth,
	HTMLElement_p_get_offsetHeight,
	HTMLElement_p_get_offsetWidth,
*/

// Element.offsetWith/Height randomization
if (!profile.fonts) { break file; }

const dispersion = profile.fonts.dispersion / 100;
const offset = 1 - dispersion;
const factor = 2 * dispersion / (256 * 256);
const rand = new Random(256 * 256);
const randomFontFactor = () => offset + rand() * factor; // returns a random number between 1 +- dispersion


function getOffsetSize(client, offset, element) {
	const correct = offset(element);
	if (!correct || client(element)) { return correct; }
	const factor = randomFontFactor();
	return correct === correct << 0 ? round(correct * factor) : correct * factor;
}


define('HTMLElement.prototype', {
	offsetWidth: { get: makeGetter(function offsetWidth() {
		return getOffsetSize(Element_p_get_clientWidth, HTMLElement_p_get_offsetWidth, this);
	}), },
	offsetHeight: { get: makeGetter(function offsetHeight() {
		return getOffsetSize(Element_p_get_clientHeight, HTMLElement_p_get_offsetHeight, this);
	}), },
});


/**
 * Returns a function that returns pseudo randoms without calling Math.random() each time for small numbers.
 * @param {number}  n  Exclusive upper bound of the randoms. (0 <= random < n)
 */
function Random(n) { // TODO: test
	const shift = ceil(log2(n));
	const factor = n / pow(2, shift);
	const mask = (1 << shift) - 1;

	let index = Infinity, buffer = [ ];

	function get() {
		index = 0;
		let rnd = random() * MAX_SAFE_INTEGER << 0;
		for (let i = shift, j = 0; i < 32; i += shift, ++j) {
			buffer[j] = ((rnd & mask) * factor) << 0;
			rnd = rnd >> shift;
		}
	}

	return function() {
		if (index >= buffer.length) { get(); }
		return buffer[index++];
	};
}
