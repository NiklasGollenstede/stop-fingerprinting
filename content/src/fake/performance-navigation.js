/* globals
	options, window
*/
/* globals
	define, currentGlobal, hideCode
*/

// performance.navigation
define('PerformanceNavigation.prototype', { // TODO: make it optional
	type: { get: hideCode('get type', function() { return 0; }), },
	toJSON: { value: hideCode(function toJSON() { return { type: 0, redirectCount: this.redirectCount, }; }), }, // TODO: use getter for .redirectCount instead
});
