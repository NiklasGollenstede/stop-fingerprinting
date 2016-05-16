'use strict';

console.log('window', window.devicePixelRatio);

document.addEventListener('DOMContentLoaded', () => {
	const sb = window.sb = document.querySelector('#sandboxed').contentWindow;
	console.log('#sandboxed', sb.devicePixelRatio);
	const xsb = window.xs = document.querySelector('#cross-sandboxed').contentWindow;
	console.log('#cross-sandboxed', xsb.devicePixelRatio);
	/*const xs = window.xs = document.querySelector('#cross-origin').contentWindow;
	console.log('#cross-origin', xs.devicePixelRatio);*/
});
