/* globals
	options, forEach, keys, reduce, split, hasOwnProperty, defineProperty, console,
	WeakMap_p_get, WeakMap_p_set, MutationObserver, MutationObserver_p_observe,
	Element_p_get_tagName, HTMLIFrameElement_p_get_contentWindow,
	querySelectorAll, document, self
*/
/* globals
	context
*/


class FakedAPIs {
	constructor(global) {
		this.global = global;
		this.build();
	}

	build() {
		this.apis = new this.global.Function('context', context.applyingSource)(context);
	}

	apply() {
		const { global, apis, } = this;

		forEach(keys(apis), key => {
			const target = reduce(split(key, '.'), (object, key) => object && object[key], global);
			target && setProps(target, apis[key]);
		});

		if (options.debug) {
			global.applyCount = (global.applyCount || 0) + 1;
			global.context = context;
		}
	}
}

function setProps(object, props) {
	keys(props).forEach(key => {
		const prop = props[key];
		if (!prop.add && !hasOwnProperty(object, key)) { return; }
		if (prop.delete) { return delete object[key]; }
		defineProperty(object, key, prop);
	});
	return object;
}

const fakeAPIs = context.fakeAPIs = function fakeAPIs(global) {
	const host = global.frameElement;

	let fake = WeakMap_p_get(context.fakes, global);
	if (!fake) {
		fake = new FakedAPIs(global);
		WeakMap_p_set(context.fakes, global, fake);
		console.log('fake.build', host);
	}
	fake.apply(); // TODO: find a better solution
	// console.log('fake.apply', host);
};

function attachObserver() {
	if (typeof MutationObserver === 'undefined') { return; } // worker
	// TODO: is it save to forEach over NodeLists (how does it get .length ?) ?
	const observer = new MutationObserver(mutations => forEach(mutations, ({ addedNodes, }) => forEach(addedNodes, element => {
		let tag; try { tag = Element_p_get_tagName(element); } catch (e) { }
		if (tag === 'IFRAME') {
			fakeAPIs(HTMLIFrameElement_p_get_contentWindow(element), element);
		} else if (tag !== undefined) {
			forEach(querySelectorAll(element, 'iframe'), element => { try {
				fakeAPIs(HTMLIFrameElement_p_get_contentWindow(element), element);
			} catch(error) { console.error(error); } });
		}
	})));
	MutationObserver_p_observe(observer, document, { subtree: true, childList: true, });
}


return (function main() {
	fakeAPIs(self);
	attachObserver(); // TODO: check if this is needed
})();
