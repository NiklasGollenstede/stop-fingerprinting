'use strict'; /* globals exports, it, expect, window */

exports.description = /* 'The [patched]? browser does[n't]? */ `persist window.opener`;

exports.timeout = 6000;

exports.getTest = isFixed => require('es6lib/concurrent')._async(function*(test, browser, ports) {

	/// @see https://blog.whatever.io/2015/03/07/on-the-security-implications-of-window-opener-location-replace/
	test.server.files = {
		'before1.html': `
			<script>document.title = 'before'</script>
			<a href="http://localhost:${ ports[1] }/replace.html" target="_blnak">Click Me</a>
		`,
		'before2.html': `
			<script>document.title = 'before'</script>
			<script>window.open('http://localhost:${ ports[1] }/replace.html')</script>
		`,
		'replace.html': `
			<script>window.opener.location.replace('http://localhost:${ ports[2] }/after.html');</script>
			<script>window.close()</script>
		`,
		'after.html': `
			<script>document.title = 'after'</script>
		`,
	};

	(yield browser.get(`http://localhost:${ ports[0] }/before1.html`));
	(yield (yield browser.findElement({ css: 'a', })).click());
	(yield require('es6lib/concurrent').sleep(700));
	expect((yield browser.executeScript(() => window.document.title))).to.equal(isFixed ? 'before' : 'after');

	(yield browser.get(`http://localhost:${ ports[0] }/before2.html`));
	(yield require('es6lib/concurrent').sleep(700));
	expect((yield browser.executeScript(() => window.document.title))).to.equal(isFixed ? 'before' : 'after');
});
