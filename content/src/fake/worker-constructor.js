/* globals
	options, document, forEach, test, Blob, self, stringify, URL, encodeURI, Document_p_get_URL,
	createObjectURL, setTimeout, revokeObjectURL, construct, defineProperty, SharedWorker, Worker,
	console,
*/
/* globals
	hideCode, define, currentGlobal, context, globals,
*/

const { TypeError, NetworkError, DOMException, } = currentGlobal;

// workers
forEach([ '', 'Shared', ], shared => {
	const ctorName = shared +'Worker';
	const Original = shared ? SharedWorker : Worker;
	if (!Original && shared === 'Shared') { return; }
	const _Worker = hideCode(ctorName, function(url) {
		if (!new.target) { throw new TypeError(`Constructor ${ ctorName } requires 'new'`); }
		if (!arguments.length) { throw new TypeError(`Not enough arguments to ${ ctorName }.`); }
		if (options.misc.disableChildBlobUrl && test((/^blob:/), url)) {
			throw new DOMException (`Failed to construct '${ ctorName }': Access to the script at '${ url }' is denied by the document's Content Security Policy.`);
		}

		console.log('caught worker construction');

		// XXX: changing the workers source to blob: changes it's CSP: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Content_security_policy
		const blob = new Blob([ `(() => {
			(`+ ((options, injectedSource, applyingSource, workerOptions) => {
				injectedSource.call(self, options, injectedSource, applyingSource);

				try {
					self.importScripts(workerOptions.entryUrl); // chrome ignores the CSP here
				} catch (error) {
					throw new (NetworkError || DOMException)(`Failed to load worker script at "${ url }"`);
				}
			}) +`)(
				JSON.parse(\`${ stringify(options) }\`),
				(${ context.scriptSource }),
				"(${ stringify(context.applyingSource) })",
				{
					entryUrl: "${ new URL(url, Document_p_get_URL(document)) }",
					name: decodeURI("${ encodeURI(shared && arguments[1] || '') }"),
				}
			);
		})()`, ]);

		const blobUrl = createObjectURL(blob);
		setTimeout(() => revokeObjectURL(blobUrl), 10);

		return construct(Original, [ blobUrl, ], new.target);
	});
	defineProperty(_Worker, 'prototype', { value: Original.prototype, }); // TODO: currentGlobal[ctorName].prototype ?

	define('self', {
		[ctorName]: { value: _Worker, },
	});
});
