/* globals
	global, forEach, keys, reduce, RegExp_p_$split, hasOwnProperty, defineProperty, assign,
*/
/* globals
	apis
*/

/**
 * apply.js:
 */

forEach(keys(apis), key => {
	const target = reduce(
		RegExp_p_$split(/\./g, key),
		(object, key) => object && object[key],
		global
	);
	target && setProps(target, apis[key]);
});

function setProps(object, descs) {
	keys(descs).forEach(key => {
		const desc = descs[key];
		if (!hasOwnProperty(object, key)) {
			if (desc.add) {
				assign(desc, desc.add);
			} else {
				console.log('not adding ', object, key, desc);
				// ???: should this throw (later?)?
				return;
			}
		}
		if (desc.delete) {
			if (!delete object[key]) { console.log('failed to delete "', key, '" from', object); }
			return;
		}
		defineProperty(object, key, desc);
	});
	return object;
}
