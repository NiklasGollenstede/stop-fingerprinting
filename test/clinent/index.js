'use strict';

console.log('window', window.devicePixelRatio);

document.addEventListener('DOMContentLoaded', () => {

	Array.prototype.forEach.call(document.querySelectorAll('iframe'), frame => {
		const cw = frame.contentWindow;
		try {
			console.log('#'+ frame.id, cw.devicePixelRatio);
		} catch (error) {
			console.info('#'+ frame.id, 'accsess denied');
		}

		window[frame.id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cw;
	});


	const iframe = document.createElement('iframe');
	document.body.appendChild(iframe);
	const loose = window.loose = iframe.contentWindow;
	console.log('lose iframe', loose.devicePixelRatio);
});
