/* globals
	values, getPrototypeOf, apply, setTimeout, setInterval, setImmediate
*/
/* globals
	hideCode, define, currentGlobal
*/

const { Error, } = currentGlobal;

// disable CSPs 'unsafe-eval' if it was inserted by the background scripts
if (values.misc.disableEval) {
	const Function = hideCode(function Function(x) { throw new Error('call to Function() blocked by CSP'); });
	Function.prototype = getPrototypeOf(x => x);
	Function.prototype.constructor = Function;
	define('self', {
		Function: { value: Function, },
		eval: { value: hideCode('eval', function(x) { throw new Error('call to eval() blocked by CSP'); }), },
		setTimeout: { value: hideCode('setTimeout', function(x) { return typeof x === 'function' ? apply(setTimeout, this, arguments) : 0; }), },
		setInterval: { value: hideCode('setInterval', function(x) { return typeof x === 'function' ? apply(setInterval, this, arguments) : 0; }), },
		setImmediate: { value: hideCode('setImmediate', function(x) { return typeof x === 'function' ? apply(setImmediate, this, arguments) : 0; }), },
	}); // TODO: any more?
}
