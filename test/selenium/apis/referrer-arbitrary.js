'use strict'; /* globals exports, it, expect, window */

exports.description = /* 'The [patched]? browser does[n't]? */ `allow arbitrary information in the referrer field`;

exports.timeout = 200000000; // TODO: remove

exports.getTest = isFixed => require('es6lib/concurrent')._async(function*(test, browser, ports) {

	const token = Math.random().toString(36).slice(2);
	test.server.files = {
		'mouse.html': `
			<a href="http://localhost:${ ports[1] }/to.html">same</a>
			<script data-token=${ token } src="/mouse.js"></script>
		`,
		'mouse.js': ((() => {
			const { token, } = document.currentScript.dataset;
			/* globals document, URL, Blob, location, history, setTimeout, */
			document.addEventListener('mousedown', event => history.replaceState(null, '', `mouse.html?token=${ token }`), true);
			document.addEventListener('mouseup',   event => setTimeout(() => history.replaceState(null, '', `mouse.html`), 20), true);
		}) +'').slice(8, -1),

		'frame.html': `
			<iframe src="/out.html" data-href="http://localhost:${ ports[1] }/to.html"></iframe>
			<script data-token=${ token } src="/frame.js"></script>
		`,
		'frame.js': ((() => {
			const { token, } = document.currentScript.dataset;
			/* globals document, URL, Blob, location, history, setTimeout, */
			const frame = document.querySelector('iframe');
			frame.onload = () => {
				frame.contentWindow.history.replaceState(null, '', `out.html?token=${ token }`);
				frame.contentWindow.document.querySelector('a').href = frame.dataset.href;
			};
		}) +'').slice(8, -1),
		'out.html': `<a target="_top" href="target">text</a>`,

		'to.html': `to.html`,
	};

	{
		(yield browser.get(`http://localhost:${ ports[0] }/mouse.html`));
		(yield (yield browser.findElement({ css: 'a', })).click());
		expect((yield browser.executeScript(() => document.referrer && new URL(document.referrer).searchParams.get('token')))).to.equal(isFixed ? '' : token);
	}

	{
		(yield browser.get(`http://localhost:${ ports[0] }/frame.html`));

		(yield browser.switchTo().frame(0));
		(yield (yield browser.findElement({ css: 'a', })).click());
		(yield browser.switchTo().frame(null));
		// (yield require('es6lib/concurrent').sleep(200000000));
		expect((yield browser.executeScript(() => document.referrer && new URL(document.referrer).searchParams.get('token')))).to.equal(isFixed ? '' : token);
	}
});
