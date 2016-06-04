window.testCanvas = function(window) { 'use strict';
	const { document, } = window;
	const canvas = document.createElement('canvas');
	document.body.appendChild(canvas);
	canvas.setAttribute('width', 220);
	canvas.setAttribute('height', 23);
	const ctx = canvas.getContext('2d');
	ctx.font = '14px Arial';
	ctx.fillStyle = '#f60';
	ctx.fillRect(127, 1, 62, 20);
	ctx.fillStyle = '#069';
	ctx.fillText('Stop Fingerprinting <canvas> test', 2, 15);
	ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
	ctx.fillText('Stop Fingerprinting <canvas> test', 4, 17);

	const url = canvas.toDataURL(); // ('image/jpeg');
	document.body.appendChild(document.createElement('img')).src = url;
	return url;
};
