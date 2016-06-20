'use strict';

test(window, 'top window');

function test(window, message) {
	try {
		console.log(message, 'external', window.devicePixelRatio);
		/*
		window.document.body.setAttribute('onclick', 'return window');
		const content = window.document.body.onclick();
		if (window === content) { return; }
		window.document.body.setAttribute('onclick', "console.log('internal', window.devicePixelRatio);");
		window.document.body.click();
		*/
	} catch (error) {
		console.info(message, 'accsess denied');
	}
}

function testCanvas(window) {
	const { document, } = window;
	const proto = CanvasRenderingContext2D.prototype;
	const canvas = document.createElement('canvas');
	// document.body.appendChild(canvas);
	canvas.setAttribute('width', 220);
	canvas.setAttribute('height', 23);
	const ctx = canvas.getContext('2d');
	ctx.font = '14px Arial';
	ctx.fillStyle = '#f60';
	proto.fillRect.call(ctx, 127, 1, 62, 20);
	ctx.fillStyle = '#069';
	proto.fillText.call(ctx, 'Stop Fingerprinting <canvas> test', 2, 15);
	ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
	proto.fillText.call(ctx, 'Stop Fingerprinting <canvas> test', 4, 17);

	const url = canvas.toDataURL(); // ('image/jpeg');
	return { url, canvas, };
}

function sha256(string) {
	return window.crypto.subtle.digest('SHA-256', new TextEncoder('utf-8').encode(string))
	.then(hash => Array.prototype.map.call(new Uint32Array(hash), r => r.toString(36)).join(''));
}

const iframes = window.iframes = {
	contentWindow(url) {
		const iframe = document.createElement('iframe');
		url && (iframe.src = url);
		document.body.appendChild(iframe);
		return (window.last = iframe.contentWindow);
	},
	contentDocument(url) {
		const iframe = document.createElement('iframe');
		url && (iframe.src = url);
		document.body.appendChild(iframe);
		return (window.last = iframe.contentDocument.defaultView);
	},
	windowFrames(url) {
		const iframe = document.createElement('iframe');
		url && (iframe.src = url);
		document.body.appendChild(iframe);
		return (window.last = window.frames[window.frames.length - 1]);
	},
	blobUrl() {
		const iframe = document.createElement('iframe');
		const blob = new Blob([ `
			console.log('blob content', window.devicePixelRatio, window.frameElement);
		`, ]);
		const blobUrl = URL.createObjectURL(blob);
		setTimeout(() => URL.revokeObjectURL(blobUrl), 10);
		iframe.src = blobUrl;
		iframe.onload = () => console.log('loaded', iframe);
		iframe.onerror = error => console.error('iframe', error);
		document.body.appendChild(iframe);
		return (window.last = iframe.contentWindow);
	}

};

const _Worker = window._Worker = class _Worker extends Worker {
	constructor(url, onMessage) {
		super(url);
		this.onmessage = onMessage;
		this.onerror = error => console.error(error);
		this.postMessage('hi');
	}
};

const Broadcast = window.Broadcast = class Broadcast extends SharedWorker {
	constructor(name) {
		super('broadcast.js', 'broadcast-channel-shim+'+ name);
	}
	get onmessage() {
		return this.port.onmessage;
	}
	set onmessage(value) {
		this.port.onmessage = value;
	}
	postMessage(message) {
		this.port.postMessage(message);
	}
};

const { url: canvasImg, canvas, } = testCanvas(window);
sha256(canvasImg).then(hash => console.log('canvas hash', hash));


document.addEventListener('DOMContentLoaded', () => {

	document.body.appendChild(canvas);
	document.body.appendChild(document.createElement('img')).src = canvasImg;

	Array.prototype.forEach.call(document.querySelectorAll('iframe'), frame => {
		const cw = frame.contentWindow;

		test(cw, '#'+ frame.id);

		window[frame.id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cw;
	});

	// test(iframes.contentWindow(), 'loose contentWindow');
	// test(iframes.contentDocument(), 'loose contentDocument');
	// test(iframes.windowFrames(), 'loose windowFrames');

});


new Fingerprint2().get(function(result, components){
	console.log('Fingerprint2 hash', result);
	console.log('Fingerprint2 components', components);
});
