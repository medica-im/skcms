/**
 * The sandbox itself, checked.
 *
 * src/lib/test-sandbox.ts is the thing standing between `npm test` and a live
 * machine, and it is invisible when it works — a setup file nobody imports and
 * nothing references. Left unchecked, a rename, a project-config edit or a
 * dropped `setupFiles` entry would disable it silently, and the first sign
 * would be another test quietly ssh-ing into production.
 *
 * So it gets tests of its own: not "does the release script behave", but "is
 * the guard actually in force in this process".
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

/** Run a shell command, returning what it printed and how it exited. */
function sh(command: string): { out: string; status: number } {
	try {
		return {
			out: execFileSync('bash', ['-c', command], {
				encoding: 'utf8',
				env: { ...process.env }
			}),
			status: 0
		};
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { out: (err.stdout ?? '') + (err.stderr ?? ''), status: err.status ?? 1 };
	}
}

describe('the unit-test sandbox', () => {
	it('blocks ssh to production', () => {
		// The exact call that started this: release-production.sh clearing a
		// live site's Redis cache from inside `npm test`.
		const { out, status } = sh('ssh production hostname');
		expect(status, 'ssh reached a real machine from a unit test').toBe(97);
		expect(out).toContain('BLOCKED:');
	});

	it('blocks ssh to staging', () => {
		const { out, status } = sh('ssh staging hostname');
		expect(status, 'ssh reached staging from a unit test').toBe(97);
		expect(out).toContain('BLOCKED:');
	});

	it.each(['scp', 'sftp', 'rsync', 'docker'])('blocks %s', (cmd) => {
		// The neighbours of ssh. A script reaching for any of these in a unit
		// test is doing the same thing by another route.
		const { status } = sh(`${cmd} --version`);
		expect(status, `${cmd} was not blocked`).toBe(97);
	});

	it('answers ssh-add -l instead of leaving it to hang', () => {
		// The gap that cost nine seconds inside a five-second test. Blocking
		// `ssh` did nothing for `ssh-add`, which is its own binary, and
		// release-production.sh runs it as a preflight before it builds
		// anything. Against a forwarded agent whose far end has gone, it blocks
		// on a dead socket rather than failing.
		//
		// Answered rather than refused: it asks a local question, and scripts
		// abort when it says no, so refusing it would stop every such script at
		// its first line and hide whatever the test was really checking.
		const { out, status } = sh('ssh-add -l');
		expect(status, 'ssh-add -l should succeed so preflights pass').toBe(0);
		expect(out).toMatch(/SHA256:/);
	});

	it('still refuses ssh-add subcommands that change the agent', () => {
		// Reading which keys exist is a preflight. Adding or dropping one is
		// touching the developer's real agent, which no test may do.
		expect(sh('ssh-add -D').status).toBe(97);
		expect(sh('ssh-add /tmp/some-key').status).toBe(97);
	});

	it('exits 97 rather than 1', () => {
		// A distinctive code on purpose. Tests that assert a script *fails*
		// would otherwise pass while the failure was really the sandbox
		// refusing a call — green for precisely the wrong reason.
		expect(sh('ssh production true').status).toBe(97);
		expect(sh('exit 1').status).toBe(1);
	});

	it('announces itself to child processes', () => {
		// Scripts that want to behave differently under test can read this
		// instead of discovering the sandbox by being refused.
		expect(sh('echo $TEST_SANDBOX').out.trim()).toBe('1');
	});

	it('leaves ordinary commands alone', () => {
		// The sandbox blocks reaching *out*, not shelling out. A guard that
		// broke every subprocess would be removed within the week.
		expect(sh('echo hello').out.trim()).toBe('hello');
		expect(sh('bash --version').status).toBe(0);
	});
});
