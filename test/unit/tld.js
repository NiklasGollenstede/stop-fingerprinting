'use strict'; /* globals global, describe, it */

const { expect, } = require('chai');
const URL = global.URL = function(s) { this.hostname = s.slice(7); };
const nameprep = string => new URL('http://'+ string).hostname;

const getTLD = require('../../background/tld/index.js');

describe('"getTLD" should', function() {
	const sut = getTLD;

	it('find basic TLDs', () => {
		expect(sut('a.b.com'))               .to.equal('.com');                // rule: com
		expect(sut('b.com.au'))              .to.equal('.com.au');             // rule: com.au
		expect(sut('com.au'))                .to.equal('.au');                 // rule: au
		expect(sut('a.b.de'))                .to.equal('.de');                 // rule: de
	});

	it('return NULL for invalid TLDs', () => {
		expect(sut('a.b.blob'))              .to.be.null;
		expect(sut('b.com.yx'))              .to.be.null;
	});

	it('return NULL for input NULL', () => {
		expect(sut(null))                    .to.be.null;
		expect(sut(undefined))               .to.be.null;
		expect(sut(false))                   .to.equal('');
	});

	it('only use 2nd level if at least 3 parts are available', () => {
		expect(sut('a.b.com.de'))            .to.equal('.com.de');             // rule: com.de
		expect(sut('com.de'))                .to.equal('.de');                 // rule: de
	});

	it(`return "" if the domain contains no '.'`, () => {
		expect(sut('localhost'))             .to.equal('');
		expect(sut('foo'))                   .to.equal('');
	});

	it('accept wildcards', () => {
		expect(sut('a.foo.ck'))              .to.equal('.foo.ck');             // rule: *.ck
	});

	it('return NULL if a wildcards would consume the last part', () => {
		expect(sut('com.ck'))                .to.be.null;                      // rule: *.ck, but no ck
	});

	it('not include excluded wildcards', () => {
		expect(sut('a.www.ck'))              .to.equal('.ck');                 // rule: *.ck, but !www.ck
	});

	it('accept company registered 2nd level TLDs', () => {
		expect(sut('a.github.io'))           .to.equal('.github.io');          // rule: github.io
	});

	it('support punycode if the URL constructor does', () => {
		expect(sut('a.'+ nameprep('游戏')))  .to.equal('.'+ nameprep('游戏'));  // rule: 游戏
	});

	it('behave as the id function on its output', () => {
		expect(sut('.com'))                  .to.equal('.com');
		expect(sut('.com.au'))               .to.equal('.com.au');
		expect(sut('.foo.ck'))               .to.equal('.foo.ck');
		expect(sut('.github.io'))            .to.equal('.github.io');
	});

});
