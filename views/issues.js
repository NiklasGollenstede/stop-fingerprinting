define(() => _=>_.document.body.insertAdjacentHTML('beforeend', `
	<link href="/views/state/index.css" rel="stylesheet">
	<div>
		<h1>Bug Reports</h1>
		<h3>If you find any bugs / issues / missing features that are not listed below, please open an <a href="https://github.com/NiklasGollenstede/stop-fingerprinting/issues" target="_blank">issue on GitHub</a>.</h3>
		<h3>Before you open new issues please make sure there isn't an existing one describing the same or a very similar topic.</p>
	</div>
	<div>
		<h1>Known bugs</h1>
		<ul>
			<li>If the browsers language is set to anything other than en-US, then navigator.language mismatches the HTTP Accept-Language header</li>
			<li>... and may more to come</li>
		</ul>
	</div>
	<div>
		<h1>Won't/Can't Fix</h1>
		<ul>
			<li><code>&lt;img srcset="... 2x"&gt;</code>, CSS media queries and the "mozmm" CSS unit leak the true devicePixelRatio</li>
			<li>...</li>
		</ul>
	</div>
	<div>
		<h1>Missing features</h1>
		<ul>
			<li>Service workers are not yet handled and may provide a communication channel between tabs</li>
			<li><a href="https://audiofingerprint.openwpm.com/" target="_blank">AudioContext</a> is not handled</li>
			<li><a href="https://www.browserleaks.com/webgl" target="_blank">WebGL properties</a> is not handled (except for canvas fingerprinting)</li>
			<li><a href="https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/" target="_blank">WebRTC local IP detection</a> should be avoidable on a per tab basis</li>
			<li>Canvas fingerprint spoofing should do something smarter than to add random noise</li>
		</ul>
		<span>For a more detailed overview see the <a href="./../home/index.html#state" target="_top">State</a> section or read the <a href="https://github.com/NiklasGollenstede/stop-fingerprinting/issues" target="_blank">issues on GitHub</a>.</span>
	</div>
`));
