/* globals
	options, clz32, ImageData, Uint8Array, ArrayBuffer, getRandomValues, min, console, apply,
	HTMLCanvasElement_p_toDataURL, HTMLCanvasElement_p_toBlob, HTMLCanvasElement_p_mozGetAsFile,
	HTMLCanvasElement_p_get_height, HTMLCanvasElement_p_get_width, HTMLCanvasElement_p_getContext, Node_p_cloneNode,
	CanvasRenderingContext2D_p_getImageData, CanvasRenderingContext2D_p_putImageData, WebGLRenderingContext_p_readPixels, RGBA, UNSIGNED_BYTE,
	ImageData_p_get_data, TypedArray_p_get_length
*/
/* globals
	hideCode, define, currentGlobal, context
*/

const { Error, } = currentGlobal;

// <canvas> randomization
if (options.canvas) {

function randomizeCanvas(canvas) {
	const width = HTMLCanvasElement_p_get_width(canvas), height = HTMLCanvasElement_p_get_height(canvas);
	let imageData, data, ctx = HTMLCanvasElement_p_getContext(canvas, '2d');
	if (ctx) {
		imageData = CanvasRenderingContext2D_p_getImageData(ctx, 0, 0, width, height);
		data = ImageData_p_get_data(imageData);
	} else {
		ctx
		=  HTMLCanvasElement_p_getContext(canvas, 'webgl') || HTMLCanvasElement_p_getContext(canvas, 'experimental-webgl')
		|| HTMLCanvasElement_p_getContext(canvas, 'webgl2') || HTMLCanvasElement_p_getContext(canvas, 'experimental-webgl2');
		if (!ctx) { return context.error(new Error('Could not get drawing context from canvas')); }
		imageData = new ImageData(width, height);
		data = new Uint8Array(TypedArray_p_get_length(ImageData_p_get_data(imageData)));
		WebGLRenderingContext_p_readPixels(
			ctx,
			0, 0, width, height,
			RGBA, UNSIGNED_BYTE,
			data
		);
	}
	randomizeUInt8Array(data, ImageData_p_get_data(imageData));
	const clone = Node_p_cloneNode(canvas, true);
	CanvasRenderingContext2D_p_putImageData(HTMLCanvasElement_p_getContext(clone, '2d'), imageData, 0, 0);
	return clone;
}

function getRandomBytes(length) {
	const buffer = new ArrayBuffer(length);
	for (let offset = 0; offset < length; offset += 65536) {
		getRandomValues(new Uint8Array(buffer, offset, min(length - offset, 65536)));
	}
	return new Uint8Array(buffer);
}

function randomizeUInt8Array(source, target = source) {
	context.notify('info', { title: 'Randomized Canvas', message: 'Spoiled possible fingerprinting', });
	const l = TypedArray_p_get_length(source), rnd = getRandomBytes(l);
	let w = 0, mask = 0;
	for (let i = 0; i < l; ++i) {
		w = source[i];
		mask = (1 << (32 - clz32(w))) - 1 >>> 2; // TODO: this leaves deterministic bits
		target[i] = w ^ (mask & rnd[i]);
	}
	return target;
}

function randomizeTypedArray(array) {
	console.trace('not implemented');
	// TODO: manipulate values in array
	return array;
}


define('HTMLCanvasElement.prototype', {
	toDataURL: { value: hideCode(function toDataURL() {
		console.log('HTMLCanvasElement.prototype.toDataURL');
		return HTMLCanvasElement_p_toDataURL(randomizeCanvas(this), ...arguments);
	}), },
	toBlob: { value: hideCode(function toBlob() {
		console.log('HTMLCanvasElement.prototype.toBlob');
		return HTMLCanvasElement_p_toBlob(randomizeCanvas(this), ...arguments);
	}), },
	mozGetAsFile: { value: hideCode(function mozGetAsFile() {
		console.log('HTMLCanvasElement.prototype.mozGetAsFile');
		return HTMLCanvasElement_p_mozGetAsFile(randomizeCanvas(this), ...arguments);
	}), },
});

define('CanvasRenderingContext2D.prototype', {
	getImageData: { value: hideCode(function getImageData(a, b, c, d) {
		const data = CanvasRenderingContext2D_p_getImageData(this, ...arguments);
		randomizeUInt8Array(data.data);
		return data;
	}), },
});

define('WebGLRenderingContext.prototype', {
	readPixels: { value: hideCode(function readPixels(a, b, c, d, e, f, data) {
		apply(WebGLRenderingContext_p_readPixels, this, arguments);
		randomizeTypedArray(data);
	}), },
});

}
