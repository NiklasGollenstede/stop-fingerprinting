self.onmessage = ({ data, }) => {
	self.postMessage({ userAgent: navigator.userAgent, });
};
