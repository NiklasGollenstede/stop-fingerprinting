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

};

const _Worker = window._Worker = class _Worker extends Worker {
	constructor(url, onMessage) {
		super(url);
		this.onmessage = onMessage;
		this.postMessage('hi');
	}
};

document.addEventListener('DOMContentLoaded', () => {

	Array.prototype.forEach.call(document.querySelectorAll('iframe'), frame => {
		const cw = frame.contentWindow;

		test(cw, '#'+ frame.id);

		window[frame.id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cw;
	});

	// test(iframes.contentWindow(), 'loose contentWindow');
	// test(iframes.contentDocument(), 'loose contentDocument');
	// test(iframes.windowFrames(), 'loose windowFrames');

	testCanvas(window);

});
