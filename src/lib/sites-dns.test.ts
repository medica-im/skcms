import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

/**
 * How test-all's Playwright reaches its own site servers from Node.
 *
 * The site specs browse https://dev.<site>, the hostname the developer's dev
 * server also answers to. test-all's servers sit behind a second address
 * (SITES_VIA, 127.0.0.2), and its Chromium is sent there with
 * --host-resolver-rules — which Node never sees. The specs' own requests
 * (request.get, page.request, requireSite's fetch) go through Node, so a
 * preload resolves the dev site names to that address in the Playwright
 * processes only. Playwright resolves through dns.promises.lookup, Node's fetch
 * and http through dns.lookup: both are covered.
 */

const PRELOAD = resolve(__dirname, '../../scripts/sites-dns.cjs');
const HOST = 'probe.dev.medica.im';

let server: Server;
let port: number;
beforeAll(async () => {
	server = createServer((_req, res) => res.end('reached'));
	await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
	port = (server.address() as AddressInfo).port;
});
afterAll(() => server.close());

/**
 * Runs `code` in a Node with the preload, and returns what it prints.
 * Asynchronously: the server it calls lives in this process.
 */
async function node(code: string, env: Record<string, string>): Promise<string> {
	const { stdout } = await promisify(execFile)(
		process.execPath,
		['--require', PRELOAD, '--input-type=module', '-e', code],
		{ encoding: 'utf8', env: { ...process.env, ...env }, timeout: 10_000 }
	);
	return stdout.trim();
}
const routed = { SITES_VIA: '127.0.0.1', SITES_HOSTS: `other.example,${HOST}` };

describe('sites-dns.cjs', () => {
	it("sends fetch for a listed name to SITES_VIA, on the URL's own port", async () => {
		const out = await node(`console.log(await (await fetch('http://${HOST}:${port}/')).text())`, routed);
		expect(out).toBe('reached');
	});

	it("answers Playwright's dns.promises.lookup with the address, IPv4 only", async () => {
		const out = await node(
			`import dns from 'node:dns';
			 console.log(JSON.stringify([
			   await dns.promises.lookup('${HOST}', { all: true, family: 4 }),
			   await dns.promises.lookup('${HOST}', { all: true, family: 6 }),
			   await dns.promises.lookup('${HOST}')
			 ]))`,
			routed
		);
		expect(JSON.parse(out)).toEqual([
			[{ address: '127.0.0.1', family: 4 }],
			[],
			{ address: '127.0.0.1', family: 4 }
		]);
	});

	it('leaves every other name alone', async () => {
		const out = await node(
			`import dns from 'node:dns'; console.log((await dns.promises.lookup('localhost', { family: 4 })).address)`,
			{ ...routed, SITES_VIA: '127.0.0.9' }
		);
		expect(out).toBe('127.0.0.1');
	});

	it('changes nothing without SITES_VIA', async () => {
		// HOST is still listed in SITES_HOSTS: the point is that the guard
		// (`if (address && hosts.size)`) keeps the shim from patching dns.lookup
		// at all when SITES_VIA is unset, even for a name it would otherwise
		// intercept. Proving that needs an outcome that depends on whether the
		// patch fired — so the fetch must still fail, the same way it would with
		// no shim loaded.
		//
		// It must not depend on *how fast* real DNS gives up on an unresolvable
		// name, though: that varies with the resolver and network the suite
		// happens to run on, and a slow NXDOMAIN once took this past Node's own
		// 10s subprocess timeout. AbortSignal.timeout bounds the fetch itself, so
		// the test's own 5s budget decides the failure, not whatever is
		// underneath it.
		await expect(
			node(
				`await fetch('http://${HOST}:${port}/', { signal: AbortSignal.timeout(5000) })`,
				{ SITES_VIA: '', SITES_HOSTS: HOST }
			)
		).rejects.toThrow();
	});
});
