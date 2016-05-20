'use strict';

test(window, 'top window');

function test(window, message) {
	try {
		console.log(message, 'external', window.devicePixelRatio);
		window.document.body.setAttribute('onclick', 'return window');
		const content = window.document.body.onclick();
		if (window === content) { return; }
		window.document.body.setAttribute('onclick', "console.log('internal', window.devicePixelRatio);");
		window.document.body.click();
	} catch (error) {
		console.info(message, 'accsess denied');
	}
}

const iframes = window.iframes = {
	contentWindow() {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		return (window.last = iframe.contentWindow);
	},
	contentDocument() {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		return (window.last = iframe.contentDocument.defaultView);
	},
	windowFrames() {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		return (window.last = window.frames[window.frames]);
	},

};

document.addEventListener('DOMContentLoaded', () => {

	Array.prototype.forEach.call(document.querySelectorAll('iframe'), frame => {
		const cw = frame.contentWindow;

		test(cw, '#'+ frame.id);

		window[frame.id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cw;
	});

	// test(iframes.contentWindow(), 'loose frame');

});
