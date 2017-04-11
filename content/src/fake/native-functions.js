/* globals
	define, makeGetter, makeSetter, makeNamedMethod,
	WeakMap_p_has, WeakMap_p_get, WeakMap_p_set, WeakMap,
	Function_p_toString,
	Error_p_get_stack, Error_p_set_stack,
	RegExp_p_$split, test, RegExp,
*/
/* globals hiddenFunctions, */

const nativeFunctionBody = true /* firefox */ ? '() {\n    [native code]\n}' : '() { [native code] }'; // TODO: check the line endings on different OSs

const makeToString = name => makeNamedMethod(name, function() {
	if (WeakMap_p_has(hiddenFunctions, this)) {
		return 'function '+ WeakMap_p_get(hiddenFunctions, this) + nativeFunctionBody;
	}
	return Function_p_toString(this);
});

define('Function.prototype', {
	toString: { value: makeToString('toString'), },
	toSource: { value: makeToString('toSource'), },
	// bind() works: it prepends a 'bound ' on its return value's name and .toString works too
});
// TODO: wrap mutation observer and mutation events to hide script injection (which injections?)

const assignedStcks = new WeakMap; // TODO: this may need to be a tab global variable

// const frameFilter = new RegExp(raw`@resource:\/\/stop-fingerprinting\/webextension\/content\/src\/(?:fake\/)?[\w-]+(?:\.js)?(?:${ profile.nonce })(?::\d+)(?::\d+)$`, 'm');
const frameFilter = new RegExp(profile.debug ? 'abcdef' : profile.nonce); // this will only match frames within the add-on code. And since the page doesn't know the nonce, it can't fake those (e.g with source maps)

define('Error.prototype', {
	stack: {
		get: makeGetter(function stack() {
			if (WeakMap_p_has(assignedStcks, this)) { return WeakMap_p_get(assignedStcks, this); }
			const stack = RegExp_p_$split((/^/gm), Error_p_get_stack(this));

			const filtered = stack.filter(line => !test(frameFilter, line)).join('');

			// console.log('filtered stack', stack.join(''), 'to', filtered);

			return filtered;
		}, x => x),
		set: makeSetter(function stack(value) {
			Error_p_set_stack(this, value);
			WeakMap_p_set(assignedStcks, this, value);
		})
	},
});

// TODO: (in firefox) errors have the own properties fileName, lineNumber and columnNimber, these need to be changes too. So:
// - call (get) error.stack on every error that is thrown (within this code)
// - extract and assign the properties in the .stack getter
// - always cache the getters result in one global WeakMap, which the setter may write to
