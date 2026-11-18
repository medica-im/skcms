import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Whether test-all's route to its own site servers is in place.
 *
 * test-all serves each dev.<site> a second time on a second loopback address
 * (scripts/nginx/dev-site-test.conf), and asks that route before starting the
 * site servers: only it marks its responses with X-Dev-Site-Test, since the
 * vhosts' own wildcard :443 answers on the same address. A wrong answer here
 * means 173 site specs run against servers that were never started.
 */

const SCRIPT = resolve(__dirname, '../../scripts/site-test-route.sh');

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'site-route-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A curl stand-in running `body` as a bash script. */
function fakeCurl(body: string): string {
	const file = join(dir, 'curl');
	writeFileSync(
		file,
		`#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${join(dir, 'args')}"\n${body}\n`
	);
	chmodSync(file, 0o755);
	return file;
}

function probe(curl: string, host = 'dev.santelyon3.fr', via = '127.0.0.2') {
	const result = spawnSync('bash', [SCRIPT, host, via], {
		encoding: 'utf8',
		env: { ...process.env, CURL: curl }
	});
	return { code: result.status, stderr: result.stderr };
}

const MARKED = String.raw`printf 'HTTP/1.1 502 Bad Gateway\r\nX-Dev-Site-Test: 1\r\n'`;

describe('site-test-route.sh', () => {
	it('passes when the route marks its response', () => {
		expect(probe(fakeCurl(`${MARKED}; printf '\\r\\n'`)).code).toBe(0);
	});

	it('passes when curl is still writing after the marker', () => {
		// curl writes header by header, the marker just before the closing blank line.
		// On 2026-11-17 a reader that stopped at the marker left curl's last write with
		// no one to read it: curl exited 23, pipefail took that over the match, and the
		// run reported a route that was answering as missing.
		expect(probe(fakeCurl(`${MARKED}; sleep 0.3; printf '\\r\\n'`)).code).toBe(0);
	});

	it('exits 1, naming the status, when an answer comes back unmarked', () => {
		const { code, stderr } = probe(
			fakeCurl(String.raw`printf 'HTTP/1.1 200 OK\r\nServer: nginx\r\n\r\n'`)
		);

		expect(code).toBe(1);
		expect(stderr).toContain('HTTP/1.1 200 OK');
		expect(stderr).toContain('X-Dev-Site-Test');
	});

	it("exits 2, naming curl's exit code, when nothing answers", () => {
		const { code, stderr } = probe(fakeCurl('exit 7'));

		expect(code).toBe(2);
		expect(stderr).toContain('curl exit 7');
	});

	it('asks the site itself, through the test address', () => {
		probe(fakeCurl(`${MARKED}; printf '\\r\\n'`), 'dev.annuaire.medica.im', '127.0.0.2');
		const args = readFileSync(join(dir, 'args'), 'utf8').split('\n');

		expect(args).toContain('::127.0.0.2:');
		expect(args[args.indexOf('::127.0.0.2:') - 1]).toBe('--connect-to');
		expect(args).toContain('https://dev.annuaire.medica.im/');
	});
});
