// Resolve the dev site names to test-all's own site servers, in Node.
//
//   NODE_OPTIONS="--require scripts/sites-dns.cjs" \
//   SITES_VIA=127.0.0.2 SITES_HOSTS=dev.santelyon3.fr,dev.unipa.fr,... \
//   npx playwright test
//
// test-all runs its own server for each dev.<site> beside the developer's, on
// the same hostname, behind a second loopback address (SITES_VIA, where
// scripts/nginx/dev-site-test.conf listens). Its Chromium gets there through
// --host-resolver-rules (playwright.config.ts); the specs' own requests go
// through Node, which knows nothing of those, so this answers Node's lookups
// for the listed names with that address instead. Loaded into the Playwright
// run only: nothing else on the machine sees it.
//
// Both entry points: Node's fetch and http resolve through dns.lookup,
// Playwright's request client through dns.promises.lookup.
'use strict';

const dns = require('node:dns');

const address = process.env.SITES_VIA;
const hosts = new Set((process.env.SITES_HOSTS || '').split(',').filter(Boolean));

if (address && hosts.size) {
	const ipv4 = { address, family: 4 };

	const lookup = dns.lookup;
	dns.lookup = function (hostname, options, callback) {
		if (typeof options === 'function') [callback, options] = [options, {}];
		if (typeof options === 'number') options = { family: options };
		if (!hosts.has(hostname)) return lookup.call(this, hostname, options, callback);
		if (options && options.all) return process.nextTick(callback, null, options.family === 6 ? [] : [ipv4]);
		process.nextTick(callback, null, address, 4);
	};

	const lookupAsync = dns.promises.lookup;
	dns.promises.lookup = async function (hostname, options) {
		if (typeof options === 'number') options = { family: options };
		if (!hosts.has(hostname)) return lookupAsync.call(this, hostname, options);
		if (options && options.all) return options.family === 6 ? [] : [ipv4];
		return ipv4;
	};
}
