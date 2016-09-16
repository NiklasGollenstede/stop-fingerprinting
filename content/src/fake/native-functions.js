/* globals
	options, WeakMap_p_has, WeakMap_p_get, Function_p_toString
*/
/* globals
	hideCode, define, currentGlobal, context
*/

const { hiddenFunctions, } = context;

const nativeFunctionBody = options.misc.browser === 'firefox' ? '() {\n    [native code]\n}' : '() { [native code] }';

const makeToString = () => hideCode(function toString() {
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
