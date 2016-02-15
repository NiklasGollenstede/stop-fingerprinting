Disables / modifies some browser APIs that would otherwise allow browser fingerprinting:
* window.screen: emulate standard fullHD screen with 40px task bar at the bottom and devicePixelRatio = 1
* window.MediaDevices: hide media devices (microphones, cameras)
* window.navigator: make all properties match to the current userAgen (if modified)
* navigator.plugins + mimeTypes: hide all plugins (they can still be used, just not enumerated)
* font detection: add a bit of randomness to inline elements width and height to confuse font detection

Works in single and multi process Firefox and applies to all pages and iframes, including 'about:blank'.

Since this (especially hiding the plug-ins) can break sites, there is also a whitelist / exclude list in the add-ons preferences.

Fingerprint and stop icon originally made by freepik.com from flaticon.com is licensed by CC BY 3.0:
* http://www.flaticon.com/free-icon/viewing-a-fingerprint-mark-like-binary-code_25939
* http://www.flaticon.com/free-icon/hand-holding-up-a-stop-sign_65331
