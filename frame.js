'use strict'; /* globals Components */ try {

// console.log('frame created');

Components.utils.import('resource://stop-fingerprinting/process.jsm', { }).addFrame(this);

} catch (error) { console.error('Error', error); }
