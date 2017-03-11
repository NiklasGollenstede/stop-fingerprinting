(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { manifest, },
	'node_modules/web-ext-utils/browser/version': { current: currentBrowser, version: browserVersion, },
	'node_modules/web-ext-utils/options/editor/about': about,
}) => ({ document: { body, }, }) => {

Object.assign(body.style, {
	margin: '0 16px',
	fontSize: '16px',
});

about({
	manifest,
	host: body.appendChild(global.document.createElement('div')),
	browser: { name: currentBrowser.replace(/^./, c => c.toUpperCase()), version: browserVersion, },
});

body.insertAdjacentHTML('beforeend', `
	<br>
	<div>
		<p>
			The icons included in this software are compositions and or derivations of icons from
			from <a href="http://www.flaticon.com" title="Flaticon" target="_blank">www.flaticon.com</a>
			licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>.
			In particular
			<ul>
				<li>Fingerprint by           <a target="_blank" href="http://www.freepik.com" title="Freepik">Freepik</a></li>
				<li>Stop sign by             <a target="_blank" href="http://www.freepik.com" title="Freepik">Freepik</a></li>
				<li>Firefox silhouette by    <a target="_blank" href="http://www.flaticon.com/authors/icomoon" title="Icomoon">Icomoon</a></li>
				<li>Chrome outline by        <a target="_blank" href="http://www.flaticon.com/authors/icomoon" title="Icomoon">Icomoon</a></li>
				<li>Options gear by          <a target="_blank" href="http://www.flaticon.com/authors/gregor-cresnar" title="Gregor Cresnar">Gregor Cresnar</a></li>
				<li>Cardiogram by            <a target="_blank" href="http://www.flaticon.com/authors/vectors-market" title="Vectors Market">Vectors Market</a></li>
				<li>Issues bug by            <a target="_blank" href="http://www.freepik.com" title="Freepik">Freepik</a></li>
				<li>Error triangle by        <a target="_blank" href="http://www.flaticon.com/authors/elegant-themes" title="Elegant Themes">Elegant Themes</a></li>
				<li>Info &#x1f6c8; by        <a target="_blank" href="http://www.freepik.com" title="Freepik">Freepik</a></li>
			</ul>
		</p>
	</div>
`);

}); })(this);
