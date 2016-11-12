'use strict'; /* globals exports, it, expect, window */

exports.description = /* 'The [patched]? browser does[n't]? */ `persist window.name`;

exports.getTest = isFixed => require('es6lib/concurrent')._async(function*(test, browser, ports) {

	const token = Math.random().toString(36).slice(2);
	test.server.files = {
		'set.html': `<script>temp = window.name = "${ token }"</script>`,
		'get.html': `<script>temp = window.name</script>`,
	};

	(yield browser.get(`http://localhost:${ ports[0] }/set.html`));
	expect((yield browser.executeScript(() => window.name))).to.equal(token);
	(yield browser.get(`http://localhost:${ ports[1] }/get.html`));
	expect((yield browser.executeScript(() => window.temp))).to.equal(isFixed ? '' : token);
});
