/* globals
	define, makeGetter, makeSetter, makeNamedMethod,
	WeakMap_p_has, WeakMap_p_get, WeakMap_p_set,
	Function_p_toString,
	Error_p_get_stack, Error_p_set_stack,
	RegExp_p_$split, test,
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

define('Error.prototype', {
	stack: {
		get: makeGetter(function stack() { // TODO: with source maps a page script can create stacks that would be modified, so catching and rethrowning new Errors is saver
			if (WeakMap_p_has(assignedStcks, this)) { return WeakMap_p_get(assignedStcks, this); }
			const stack = RegExp_p_$split((/^/gm), Error_p_get_stack(this));

			const filtered = stack.filter(line => !test((
				(/@resource:\/\/stop-fingerprinting\/webextension\/content\/src\/(:?fake\/)?[\w-]+(:?\.js)?(:?:\d+)(:?:\d+)$/m)
			), line)).join('');

			console.log('filtered stack', stack.join(''), 'to', filtered);

			return filtered;
		}, x => x),
		set: makeSetter(function stack(value) {
			Error_p_set_stack(this, value);
			WeakMap_p_set(assignedStcks, this, value);
		})
	},
});
