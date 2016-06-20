
- write introduction/description/about/credits/... pages

- spoof navigator.language(s)

- handle ServiceWorkers (cache deactivation should make them de-facto useless, but they are probably still able to provide similar services as an unwrapped Shared Worker would)
- prevent AudioContext fingerprinting (see https://audiofingerprint.openwpm.com/)
- mess with WebGL (https://www.browserleaks.com/webgl)
- try different methods to change the canvas (sharpening, moving, blurring, ...)
- change time zone and add small random offsets to Dates and change toLocaleString
- disable WebRTC local IP detection on a per-tab basis, make sure media device enumeration is diabled
- do something about console.memory in chrome (?)
- do image sets with variable resolution or css media queries leak the true devicePixelRatio?
