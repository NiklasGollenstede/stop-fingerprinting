(function() { 'use strict';

const {
	network: { mimeTypes, },
} = require('es6lib');

const {
	contentSecurityPolicy: Csp,
	frameguard: Frameguard,
	// ienoopen:
	noSniff,
} = require('helmet');

const config = process.project_config;

const CSP = module.exports = function CSP(app) {
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
			imgSrc: self('data:'),
			// manifestSrc: [ ],
			// mediaSrc: [ ],
			// objectSrc: [ ],
			// scriptSrc: self(),
			// styleSrc: self(),

			// referrer
			// reflected-xss
			// upgradeInsecureRequests: [ ], // true
			// sandbox: [ ],
			// pluginTypes: [ mimeTypes.html, ],

			reportUri: '/csp',
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
	return app;
};

CSP.onerror = function(request, response) {
	console.log('CSP error: ', request.body);
	response.writeHead(204);
	response.end();
};


function self(...others) {
	return (
		config.origins
		? config.origins.concat("'self'")
		: [ "'self'", /*'https://$$', 'http://$$', 'https://*.$$', 'http://*.$$',*/ ].map(s => s.replace(/\$\$/, () => config.host))
	).concat(others);
}

})();
