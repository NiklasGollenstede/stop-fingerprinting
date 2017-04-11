
- add prompt to ether accept cert -or- enable chrome://flags/#allow-insecure-localhost -or- FireFox -> Options -> Advanced -> Certificates -> View Certificates -> Servers -> Add Exception

- test data: or blob: as main_frame URLs
- documents served from the same "base domain" (but different sub domains) may mutually decide to step out of sub domains and thus become same origin (see: https://developer.mozilla.org/en-US/docs/Web/API/Document/domain)

- write introduction/description/about/credits/... pages

- spoof navigator.language(s)
- the 'Host' header field will be different for non-ASCII names

- document.referrer

- reset history.length

- make localhost inaccessible for web content

- suggest to set locale to en-US

- disable gamepads via "dom.gamepad.enabled"

- "network.jar.block-remote-files"

- ??? set "browser.download.forbid_open_with" to true and register to open-external event to warn user that additional resources may be loaded by the external software?

- does the order and timing of keyboard/mouse events vary across operating systems?

- handle ServiceWorkers (disable via "dom.workers.sharedWorkers.enabled") (cache deactivation should make them de-facto useless, but they are probably still able to provide similar services as an unwrapped Shared Worker would)
- prevent AudioContext fingerprinting (see https://audiofingerprint.openwpm.com/)
- mess with WebGL (https://www.browserleaks.com/webgl)
- try different methods to change the canvas (sharpening, moving, blurring, ...); related: images with and w/o ICC profiles render differently
- do something about emoji fonts (they greatly vary, what if they are drawn on a canvas?)
- change time zone and add small random offsets to Dates and change toLocaleString
- disable WebRTC local IP detection on a per-tab basis, make sure media device enumeration is disabled
- do something about console.memory in chrome (?)
- how exactly are CSP reports send?
- what about protocols other than http(s) ? (ftp, ... ?)
- InstallTrigger (firefox)
- ``<img srcset="... 2x">``, CSS media queries and the "mozmm" CSS unit leak the true devicePixelRatio

Problematic media queries:
- -moz-os-version: windows-xp to windows-win10
- -moz-mac-graphite-theme: MacOS (0 or 1)
- -moz-maemo-classic: ?
- -moz-images-in-menus: icons in context menus (?)
