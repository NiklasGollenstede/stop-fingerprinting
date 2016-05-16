
- Also handle Workers: apparently there is no direct API to do this, so: catch url in constructor and append code to response from that url (?)
- Also handle BroadcastChannels
- see: https://security.stackexchange.com/questions/102279/can-hsts-be-disabled-in-firefox
- Add option to disable WebRTC and geo location API (default: disable)
- Add option to enable DNT (default: unchanged)
- Add option to set HTTP_ACCEPT (default: unchanged)
