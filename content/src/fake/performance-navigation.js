/* globals
	define, makeGetter, makeMethod,
*/

// performance.navigation
define('PerformanceNavigation.prototype', { // TODO: make it optional
	type: { get: makeGetter(function type() { return 0; }), },
	toJSON: { value: makeMethod(function toJSON() { return cloneInto({ type: 0, redirectCount: this.redirectCount, }); }), }, // TODO: use getter for .redirectCount instead
});
