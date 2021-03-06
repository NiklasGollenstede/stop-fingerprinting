'use strict';

// console.log(`eval('2 + 3')`, eval('2 + 3'));

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
		url && (iframe.src = url || 'about:blank');
		document.body.appendChild(iframe);
		return (window.last = iframe.contentWindow);
	},
	contentDocument(url) {
		const iframe = document.createElement('iframe');
		url && (iframe.src = url || 'about:blank');
		document.body.appendChild(iframe);
		return (window.last = iframe.contentDocument.defaultView);
	},
	windowFrames(url) {
		const iframe = document.createElement('iframe');
		url && (iframe.src = url || 'about:blank');
		iframe.sandbox = 'allow-same-origin';
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
	canvas.toBlob(blob =>
		document.body.appendChild(document.createElement('img')).src = URL.createObjectURL(blob)
	);

	console.log('window.frames', Array.prototype.map.call(window.frames, cw => cw.devicePixelRatio));

	Array.prototype.forEach.call(document.querySelectorAll('iframe'), frame => {
		const cw = frame.contentWindow;

		test(cw, '#'+ frame.id);

		window[frame.id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cw;
	});

	// test(iframes.contentWindow(), 'loose contentWindow');
	// test(iframes.contentDocument(), 'loose contentDocument');
	// test(iframes.windowFrames(), 'loose windowFrames');

});

/*
new Fingerprint2().get(function(result, components){
	console.log('Fingerprint2 hash', result);
	console.log('Fingerprint2 components', components);
});
*/

const HttpRequest = (function() {

var XHR; try { XHR = (/* global XMLHttpRequest */ typeof XMLHttpRequest !== 'undefined') ? XMLHttpRequest : require('sdk/net/xhr'/* firefox */).XMLHttpRequest; } catch(e) { }
var ProgressEventConstruntor; try { /* global ProgressEvent */ new ProgressEvent(''); ProgressEventConstruntor = ProgressEvent; } catch (error) { ProgressEventConstruntor = function(reason) { const error = document.createEvent('ProgressEvent'); error.initEvent(reason, false, false); return error; }; }

return function HttpRequest(url, options) {
	var request, cancel;
	const o = arguments[arguments.length - 1] || { };
	const promise = new Promise(function(resolve, reject) {
		typeof url !== 'string' && (url = o.url || o.src);

		request = new XHR(o);
		cancel = cancelWith.bind(request, reject);

		request.open(o.method || "get", url, true, o.user, o.password);

		o.responseType && (request.responseType = o.responseType);
		o.timeout && (request.timeout = o.timeout);
		o.overrideMimeType && request.overrideMimeType(o.overrideMimeType);
		(o.xhr == null || o.xhr) && request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		o.header && Object.keys(o.header).forEach(function(key) { request.setRequestHeader(key, o.header[key]); });

		request.onerror = reject;
		request.ontimeout = reject;
		request.onload = function(event) {
			if (request.status >= 200 && request.status < 300) {
				resolve(request);
			} else {
				cancel('bad status');
			}
		};
		request.send(o.body);
	});
	o.needAbort && (promise.abort = function() {
		request.abort();
		cancel('canceled');
	});
	return promise;
};
function cancelWith(reject, reason) {
	const error = new ProgressEventConstruntor(reason);
	this.dispatchEvent(error);
	reject(error);
}
})();

/*
HttpRequest('./frame.html').then(({ response: html, }) => {
	const iframe = document.createElement('iframe');
	iframe.srcdoc = html;
	document.body.appendChild(iframe);
	return (window.last = iframe.contentWindow);
});
*/
