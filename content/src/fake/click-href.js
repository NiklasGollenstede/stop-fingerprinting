/* globals
	define, makeMethod, makeSetter,
	document, HTMLAnchorElement_p_set_href, HTMLElement_p_setAttribute, HTMLElement_p_setAttributeNS,
*/

let focused = null; // this is inaccurate if additional mouse buttons are pressed before the first one is released, but that is rather rare user behavior which can't be influenced by the website. So it is probably Ok to ignore it

document.addEventListener('mousedown', event => event.isTrusted && (focused = event.target), true);
document.addEventListener('mouseup',   event => event.isTrusted && (focused = null),         true);
document.addEventListener('dragend',   event => event.isTrusted && (focused = null),         true);

//	document.addEventListener('mousedown', event => console.log(event, focused), true);
//	document.addEventListener('mouseup',   event => console.log(event, focused), true);
//	document.addEventListener('dragend',   event => console.log(event, focused), true);

define('HTMLAnchorElement.prototype', { // TODO: make it optional
	href: { set: makeSetter(function href(href) {
		//	console.log('href', href);
		if (focused && this === focused) { return; }
		HTMLAnchorElement_p_set_href(this, href);
	}), },
});

define('HTMLElement.prototype', { // TODO: make it optional
	setAttribute: { value: makeMethod(function setAttribute(name, value) {
		//	console.log('setAttribute', name, value);
		name = (name +'').toLowerCase();
		if (name !== 'href' || focused && this === focused) { return; }
		HTMLElement_p_setAttribute(this, name, value);
	}), },
	setAttributeNS: { value: makeMethod(function setAttributeNS(name, value, ns) {
		//	console.log('setAttributeNS', name, value);
		name = (name +'').toLowerCase();
		if (name !== 'href' || focused && this === focused) { return; }
		HTMLElement_p_setAttributeNS(this, name, value, ns);
	}), },
});

// TODO: also needs to handle the value (and others) setter on the AttrNode returned by .getAttributeNode('href')
