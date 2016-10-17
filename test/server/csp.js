(function() { 'use strict'; /* globals module */

const {
	network: { mimeTypes, },
} = require('es6lib');

const BodyParser = require('body-parser');

const {
	contentSecurityPolicy: Csp,
	frameguard: Frameguard,
	// ienoopen:
	noSniff,
} = require('helmet');

const CSP = module.exports = function CSP(app, {
	host = 'localhost',
	origins = null,
	reportUri = '/csp',
} = { }) {
	app.use(new Csp({
		/**
		 * Rules
		 */
		directives: {
			defaultSrc: self(),

			// baseUri: self(),
			childSrc: self(),
			// connectSrc: self(),
			// fontSrc: self(),
			// formAction: [ ],
			// frameAncestors: self(),
			frameSrc: [ '*', 'data:', 'blob:', ],
			imgSrc: self('data:', 'blob:'),
			// manifestSrc: [ ],
			// mediaSrc: [ ],
			// objectSrc: [ ],
			scriptSrc: self("'unsafe-inline'"),
			// styleSrc: self(),

			// referrer
			// reflected-xss
			// upgradeInsecureRequests: [ ], // true
			// sandbox: [ ],
			// pluginTypes: [ mimeTypes.html, ],

			reportUri,
		},

		/**
		 * Settings
		 */
		reportOnly: false,
		setAllHeaders: false,
		// Set to true if you want to disable CSP on Android.
		disableAndroid: false,
		// Set to true if you want to force buggy CSP in Safari 5.1 and below.
		safari5: false,
	}));
	// app.use(new Frameguard()); // prevent being loaded in cros-origin frames
	app.use(noSniff()); // force browsers to respect mime-types
	app.disable('x-powered-by');

	app.use(reportUri, BodyParser.json({ limit: '10kb', type: [ 'application/csp-report', mimeTypes.json, ], }));
	app.post(reportUri, function(request, response) {
		console.log('CSP error: ', request.body);
		response.writeHead(204);
		response.end();
	});

	function self(...others) {
		return (
			origins
			? origins.concat("'self'")
			: [ "'self'", /*'https://$$', 'http://$$', 'https://*.$$', 'http://*.$$',*/ ].map(s => s.replace(/\$\$/, () => host))
		).concat(others);
	}

	return app;
};

})();
