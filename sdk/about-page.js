'use strict';

// Ci.nsIAboutModule.URI_MUST_LOAD_IN_CHILD;


const { Cc, Ci, Cm, Cr, Cu, components: Components, } = require('chrome');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm'); /* global XPCOMUtils */
Components.utils.import('resource://gre/modules/Services.jsm'); /* global Services */

const { Guid, } = require('./webextension/node_modules/es6lib/string.js');

class AboutPage {
	constructor({ url, name, uuid, }) {
		this.url = url; this.name = name;
		const id = this.id = Components.ID(uuid || Guid());

		this.factory = XPCOMUtils.generateNSGetFactory([class {
			QueryInterface(what) { return what === Ci.nsIAboutModule ? this : null; }
			// get classDescription() { return 'about:'+ name; }
			get classID() { return id; }
			// get contractID() { return '@mozilla.org/network/protocol/about;1?what='+ name; }

			newChannel(uri) {
				//const channel = Services.io.newChannel(this.url, null, null);
				const channel = Services.io.newChannelFromURIWithLoadInfo(Services.io.newURI(this.url, null, null), arguments[1]);
				channel.originalURI = uri;
				channel.owner = Cc['@mozilla.org/scriptsecuritymanager;1'].getService(Ci.nsIScriptSecurityManager).getSystemPrincipal(uri);
				return channel;
			}

			getURIFlags(uri) {
				return Ci.nsIAboutModule.ALLOW_SCRIPT;
			}
		}])(this.id);

/*
		this.factory = { createInstance(outer, iid) {
			if (outer) { throw Cr.NS_ERROR_NO_AGGREGATION; }
			return ({
				QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
				classID: id,

				newChannel(uri) {
					//const channel = Services.io.newChannel(this.url, null, null);
					const channel = Services.io.newChannelFromURIWithLoadInfo(Services.io.newURI(this.url, null, null), arguments[1]);
					channel.originalURI = uri;
					channel.owner = Cc['@mozilla.org/scriptsecuritymanager;1'].getService(Ci.nsIScriptSecurityManager).getSystemPrincipal(uri);
					return channel;
				},

				getURIFlags(uri) {
					return Ci.nsIAboutModule.ALLOW_SCRIPT;
				},
			}).QueryInterface(iid);
		}, };
*/
	}

	register() {
		Cm.QueryInterface(Ci.nsIComponentRegistrar).registerFactory(
			this.id,
			'about:'+ this.name,
			'@mozilla.org/network/protocol/about;1?what='+ this.name,
			this.factory
		);
	}

	unregister() {
		Cm.QueryInterface(Ci.nsIComponentRegistrar).unregisterFactory(
			this.id,
			this.factory
		);
	}

	destroy() {
		this.unregister();
		this.id = this.factory = this.name = null;
	}
}

module.exports = AboutPage;



module.exports.register = (/*{ url, name, uuid, }*/) => {
/*
uuid = uuid || Guid();
const aboutUri = 'about:'+ name;*/

const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);

Components.utils.import("resource://gre/modules/Services.jsm");

// globals
var factory;
const aboutPage_description = 'This is my custom about page';
const aboutPage_id = 'aa132730-2278-11e5-867f-0800200c9a66'; // make sure you generate a unique id from https://www.famkruithof.net/uuid/uuidgen
const aboutPage_word = 'myaboutpage';
// const aboutPage_page = 'data:text/html,<iframe src="moz-extension://bda3d6d1-6bf2-4641-8fdf-f6077fa79c6c/ui/home/index.html#options"></iframe>';
const aboutPage_page = 'resource://stop-fingerprinting/about.html';

function AboutCustom() {}
AboutCustom.prototype = Object.freeze({
    classDescription: aboutPage_description,
    contractID: '@mozilla.org/network/protocol/about;1?what=' + aboutPage_word,
    classID: Components.ID('{' + aboutPage_id + '}'),
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

    getURIFlags: function(aURI) {
        return Ci.nsIAboutModule.ALLOW_SCRIPT;
    },

    newChannel: function(aURI, aSecurity_or_aLoadInfo) {
        var channel;
        if (Services.vc.compare(Services.appinfo.version, '47.*') > 0) {
              let uri = Services.io.newURI(aboutPage_page, null, null);
              // greater than or equal to firefox48 so aSecurity_or_aLoadInfo is aLoadInfo
              channel = Services.io.newChannelFromURIWithLoadInfo(uri, aSecurity_or_aLoadInfo);
        } else {
              // less then firefox48 aSecurity_or_aLoadInfo is aSecurity
              channel = Services.io.newChannel(aboutPage_page, null, null);
        }
        channel.originalURI = aURI;
        return channel;
    }
});

function Factory(component) {
    this.createInstance = function(outer, iid) {
        if (outer) {
            throw Cr.NS_ERROR_NO_AGGREGATION;
        }
        return new component();
    };
    this.register = function() {
        Cm.registerFactory(component.prototype.classID, component.prototype.classDescription, component.prototype.contractID, this);
    };
    this.unregister = function() {
        Cm.unregisterFactory(component.prototype.classID, this);
    };
    Object.freeze(this);
    this.register();
}

factory = new Factory(AboutCustom);

};
