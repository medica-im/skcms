/**
 * Keeps the unit suite off the network — production and staging especially.
 *
 * Loaded by vitest for every file in the `unit` project (see `setupFiles` in
 * vite.config.ts), so it protects tests nobody has written yet rather than the
 * one that went wrong.
 *
 * **What went wrong.** src/lib/release-production.test.ts runs the real
 * release-production.sh with build and deploy stubbed. Everything *else* in
 * that script stayed live, including the step that clears each site's Redis
 * cache over ssh. A single `npm test` therefore opened five connections to
 * `production` and `old-staging` and ran `redis-cli DEL` against sites that
 * were serving users. It also made the suite's timing depend on the network:
 * the run sat within milliseconds of vitest's 5s limit and failed whenever the
 * VPSes were slow.
 *
 * Nothing about those tests wants a real host — they check which sites the
 * script picks and whether it stops at a failure. The remote calls were
 * incidental, which is exactly why nobody noticed them.
 *
 * **The rule.** A unit test may not touch a machine it does not own. Not
 * production, not staging, not dev. If a test needs a remote answer it is an
 * integration test and belongs with the Playwright suite, which has its own
 * per-worker environment.
 *
 * **How it is enforced.** Two layers, because either alone leaks:
 *
 * 1. `PATH` is prefixed with a directory holding fakes for `ssh`, `scp`,
 *    `rsync` and `docker`. A child process — a shell script under test — gets
 *    the fake, which exits non-zero and prints what it was asked to do. Tests
 *    that shell out are the ones that reached production, and a fake is the
 *    only thing that stops them, since vitest cannot intercept a subprocess.
 * 2. `TEST_SANDBOX=1` and `CLEAR_CACHE=0` are exported. The second is
 *    release-production.sh's own documented way to skip the cache step, so the
 *    script takes the quiet path rather than being caught by a fake.
 *
 * The fakes are deliberately loud. A silent no-op would let a test pass while
 * believing it had done something remote, which is a worse failure than the
 * one being fixed.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll } from 'vitest';

/**
 * Commands a unit test has no business running against a real machine.
 *
 * `ssh-add` is here because blocking `ssh` did not cover it: it is a separate
 * binary, and release-production.sh calls it twice as a preflight before it
 * builds anything. It talks to the agent socket rather than to a host, so it
 * looks harmless — but a forwarded agent whose far end has gone away leaves it
 * blocking on a dead socket for as long as the connection takes to time out.
 * That is what spent nine seconds inside a five-second test while `ssh` itself
 * was faked and innocent.
 *
 * The lesson generalises: it is the *binary name* that gets faked, so a family
 * of related tools needs every member listed.
 */
const FORBIDDEN = ['ssh', 'ssh-add', 'ssh-agent', 'ssh-keyscan', 'scp', 'sftp', 'rsync', 'docker', 'docker-compose'];

let sandboxDir: string | undefined;

beforeAll(() => {
	sandboxDir = mkdtempSync(join(tmpdir(), 'vitest-sandbox-'));

	for (const cmd of FORBIDDEN) {
		// Exit 97 rather than 1: a distinctive code, so a test that asserts on
		// failure cannot pass by mistaking a blocked call for the failure it
		// meant to provoke.
		writeFileSync(
			join(sandboxDir, cmd),
			`#!/usr/bin/env bash
echo "BLOCKED: a unit test tried to run '${cmd} $*'" >&2
echo "  Unit tests must not reach a real machine — see src/lib/test-sandbox.ts" >&2
exit 97
`,
			{ mode: 0o755 }
		);
	}

	// ...except `ssh-add -l`, which answers rather than refuses.
	//
	// It is a local question — "does this agent hold a key" — and scripts ask it
	// as a preflight before doing any remote work. Refusing it would make every
	// such script abort at its first line, so a test could no longer reach the
	// decisions it exists to check: release-production.sh would exit with "no
	// SSH agent with a usable key" long before it selected a single site.
	//
	// Answering "yes, one key" is both harmless and truthful about the only
	// thing the caller does with it, and it costs nothing: no socket is opened,
	// so a stale forwarded agent cannot block on a dead connection. Any *other*
	// ssh-add subcommand still refuses, since nothing in a unit test should be
	// adding or removing keys.
	writeFileSync(
		join(sandboxDir, 'ssh-add'),
		`#!/usr/bin/env bash
if [[ "\$1" == "-l" || "\$1" == "-L" ]]; then
    echo "4096 SHA256:e2e-sandbox-key sandbox@test (RSA)"
    exit 0
fi
echo "BLOCKED: a unit test tried to run 'ssh-add \$*'" >&2
echo "  Unit tests must not reach a real machine — see src/lib/test-sandbox.ts" >&2
exit 97
`,
		{ mode: 0o755 }
	);

	process.env.PATH = `${sandboxDir}:${process.env.PATH ?? ''}`;
	process.env.TEST_SANDBOX = '1';
	// release-production.sh's own escape hatch, so the cache step is skipped by
	// agreement rather than blocked by a fake.
	process.env.CLEAR_CACHE = '0';
});

afterAll(() => {
	if (sandboxDir) rmSync(sandboxDir, { recursive: true, force: true });
});
