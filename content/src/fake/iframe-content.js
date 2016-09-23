/* globals
	options, console,
	HTMLIFrameElement_p_get_contentWindow, HTMLIFrameElement_p_get_contentDocument,
*/
/* globals
	define, hideCode, context,
*/

// catch all calls that retrieve an window object from an iframe and make sure that iframe is wrapped
define('HTMLIFrameElement.prototype', { // TODO: check in these (expensive) handlers are necessary
	contentWindow: { get: hideCode(function() {
		const window = HTMLIFrameElement_p_get_contentWindow(this);
		if (window) { try {
			context.fakeAPIs(window);
		} catch (error) { console.error('fakeAPIs in get contentWindow failed', error); } }
		return window;
	}), },
	contentDocument: { get: hideCode(function() {
		const document = HTMLIFrameElement_p_get_contentDocument(this);
		if (document) { try {
			context.fakeAPIs(document.defaultView);
		} catch (error) { console.error('fakeAPIs in get contentDocument failed', error); } }
		return document;
	}), },
});
// TODO: window.frames
