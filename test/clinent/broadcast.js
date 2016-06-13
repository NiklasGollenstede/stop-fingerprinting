'use strict';

const ports = new Set;

self.onconnect = ({ ports: [ port, ], }) => {
	ports.add(port);
	port.start();
	port.onmessage = ({ data, }) => {
		ports.forEach(port => port.postMessage(data));
	};
};
