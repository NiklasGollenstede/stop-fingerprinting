/* globals
	options, hiddenFunctions, WeakMap_p_has, WeakMap_p_get, Function_p_toString
*/
/* globals
	hideCode, define, currentGlobal
*/

const nativeFunctionBody = options.misc.browser === 'firefox' ? '() {\n    [native code]\n}' : '() { [native code] }';
const toString = hideCode(function toString() {
	if (WeakMap_p_has(hiddenFunctions, this)) {
		return 'function '+ WeakMap_p_get(hiddenFunctions, this) + nativeFunctionBody;
	}
	return Function_p_toString(this);
});
define('Function.prototype', {
	toString: { value: toString, },
	toSource: { value: toString, },
});
// TODO: hide stack traces
// TODO: wrap mutation observer and mutation events to hide script injection
