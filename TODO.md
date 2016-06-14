
- let HTTP_ACCEPT match the userAgent
- handle ServiceWorkers
- prevent AudioContext finggerprinting (see https://audiofingerprint.openwpm.com/)
- mess with WebGL (https://www.browserleaks.com/webgl)
- try different methods to change the canvas (sharpening, moving, blurring, ...)
- disable WebRTC local IP detection on a per-tab basis, make sure media device enumeration is diabled
- do something about console.memory in chrome (?)
- is the Application Cache feature a reason for concern and how could it be disabled?
- do image sets with variable resolution or css media queries leak the true devicePixelRatio?
