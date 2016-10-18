/* globals
	hideCode, define, WeakMap_p_has, WeakMap_p_get, Function_p_toString,
*/
/* globals hiddenFunctions, */

const nativeFunctionBody = true /* firefox */ ? '() {\n    [native code]\n}' : '() { [native code] }'; // TODO: check the line endings on different OSs

const makeToString = () => hideCode(function toString() {
	// TODO: test bound functions
	if (WeakMap_p_has(hiddenFunctions, this)) {
		return 'function '+ WeakMap_p_get(hiddenFunctions, this) + nativeFunctionBody;
	}
	return Function_p_toString(this);
});

define('Function.prototype', {
	toString: { value: makeToString(), },
	toSource: { value: makeToString(), },
});
// TODO: hide stack traces
// TODO: wrap mutation observer and mutation events to hide script injection
