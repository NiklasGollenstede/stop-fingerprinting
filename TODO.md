
- write introduction/description/about/credits/... pages

- spoof navigator.language(s)

- handle ServiceWorkers (cache deactivation should make them de-facto useless, but they are probably still able to provide similar services as an unwrapped Shared Worker would)
- prevent AudioContext fingerprinting (see https://audiofingerprint.openwpm.com/)
- mess with WebGL (https://www.browserleaks.com/webgl)
- try different methods to change the canvas (sharpening, moving, blurring, ...)
- do something about emoji fonts (they greatly vary, what if they are drawn on a canvas?)
- change time zone and add small random offsets to Dates and change toLocaleString
- disable WebRTC local IP detection on a per-tab basis, make sure media device enumeration is disabled
- do something about console.memory in chrome (?)
- do image sets with variable resolution or CSS media queries leak the true devicePixelRatio?, the "mozmm" CSS unit definitely does
