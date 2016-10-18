/* globals
	global, forEach, keys, reduce, split, hasOwnProperty, defineProperty,
*/
/* globals
	apis
*/

/**
 * apply.js:
 */

forEach(keys(apis), key => {
	const target = reduce(split(key, '.'), (object, key) => object && object[key], global);
	target && setProps(target, apis[key]);
});

function setProps(object, props) {
	keys(props).forEach(key => {
		const prop = props[key];
		if (!prop.add && !hasOwnProperty(object, key)) { return; }
		if (prop.delete) { return delete object[key]; }
		defineProperty(object, key, prop);
	});
	return object;
}
