'use strict'; /* globals exports, it, expect */

exports.description = /* 'The [patched]? browser does[n't]? */ `not have the font 'Bell MT'`;

exports.disabled = true;

exports.getTest = isFixed => require('es6lib/concurrent')._async(function*(test, browser, ports) {

	const token = Math.random().toString(36).slice(2);
	test.server.files = {
		'index.html': `
			<span id="span1">Some Text</span>
			<span id="span2">Some Text</span>
			<script src="/index.js"></script>
		`,
		'index.js': ((() => {
			const e1 = window.document.querySelector('#span1');
			const e2 = window.document.querySelector('#span2');
			e1.style.fontFamily = 'Bell MT';
			window.installed = e1.offsetWidth !== e2.offsetWidth;
		}) +'').slice(8, -1),
	};

	(yield browser.get(`http://localhost:${ ports[1] }/index.html`));

	// isFixed && (yield require('es6lib/concurrent').sleep(2000000000));

	expect((yield browser.executeScript(() => window.installed +''))).to.equal(isFixed +'');
});
