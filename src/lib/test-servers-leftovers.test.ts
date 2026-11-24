import { afterEach, describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

/**
 * What an earlier test-all run leaves behind, and how it is told apart from
 * the run that is going on now.
 *
 * On 2026-11-24 a unipa site server (760 MB) and the `test-all.sh bdd` that
 * started it had been running for 22 hours, their parent long gone, while a
 * full run was starving for memory beside them. Nothing noticed: the stamp
 * files that stop_site_servers goes by were gone, and nothing looked at the
 * process table.
 *
 * A leftover is recognised by what it is and by whose session it is in.
 * Everything a run starts shares the run's session, so anything that looks
 * like a test server or a test-all but is in another session was not started
 * by this run. The developer's own dev servers are never test servers: they
 * have no --mode.
 */

const LIB = resolve(__dirname, '../../scripts/lib/test-servers.sh');
const ROOT = '/home/dev/skcms-test';

/** One `ps -eo pid=,sid=,rss=,args=` line. */
const proc = (pid: number, sid: number, rssKb: number, args: string) =>
	`${pid} ${sid} ${rssKb} ${args}`;

const vite = (port: number, mode?: string) =>
	`node ${ROOT}/node_modules/.bin/../vite/bin/vite.js --port ${port} --strictPort${mode ? ` --mode ${mode}` : ''}`;

const NOW = 500;
const EARLIER = 100;

function leftovers(table: string[], currentSid = NOW) {
	const result = spawnSync(
		'bash',
		[
			'-c',
			`source "${resolve(__dirname, '../../scripts/lib/output.sh')}"
			 source "${LIB}"
			 list_leftover_test_servers "$1"`,
			'bash',
			String(currentSid)
		],
		{ encoding: 'utf8', env: { ...process.env, TS_PROCESS_TABLE: table.join('\n') } }
	);
	return result.stdout
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [pid, kind, mb] = line.split('\t');
			return { pid: Number(pid), kind, mb: Number(mb) };
		});
}

describe('the test servers an earlier run left behind', () => {
	it('names a site server that belongs to another session, with its weight', () => {
		expect(leftovers([proc(3144616, EARLIER, 762764, vite(3215, 'site.unipa'))])).toEqual([
			{ pid: 3144616, kind: 'server', mb: 745 }
		]);
	});

	it('names a worker server of another session just the same', () => {
		expect(leftovers([proc(41, EARLIER, 2048, vite(3303, 'test.w3'))])).toMatchObject([
			{ pid: 41, kind: 'server' }
		]);
	});

	it('names the test-all that nobody is running any more', () => {
		expect(
			leftovers([proc(3144601, EARLIER, 904, `bash ${ROOT}/scripts/test-all.sh bdd`)])
		).toMatchObject([{ pid: 3144601, kind: 'run' }]);
	});

	it('leaves alone what the run going on now started', () => {
		expect(
			leftovers([
				proc(309383, NOW, 1959988, vite(3301, 'test.w1')),
				proc(240151, NOW, 2892, `bash ${ROOT}/scripts/test-all.sh`)
			])
		).toEqual([]);
	});

	it("never takes the developer's own dev servers for test servers", () => {
		expect(
			leftovers([
				proc(4128414, EARLIER, 855580, 'node ./node_modules/.bin/../vite/bin/vite.js --port 3011 --strictPort'),
				proc(77, EARLIER, 800000, vite(3000))
			])
		).toEqual([]);
	});

	it('does not mistake a command that merely mentions test-all.sh for a run', () => {
		expect(
			leftovers([
				proc(5, EARLIER, 100, '/bin/bash -c source /tmp/snapshot.sh && ./scripts/test-all.sh bdd'),
				proc(6, EARLIER, 100, 'tail -f /tmp/test-all.sh.log'),
				proc(7, EARLIER, 100, `grep ${ROOT}/scripts/test-all.sh x`)
			])
		).toEqual([]);
	});

	it('says nothing when nothing is left', () => {
		expect(leftovers([])).toEqual([]);
	});
});

describe('stopping them', () => {
	const started: number[] = [];
	afterEach(() => {
		for (const pid of started.splice(0)) {
			try {
				process.kill(pid, 'SIGKILL');
			} catch {
				// Already stopped, which is the point.
			}
		}
	});

	/** A long-lived process of its own, in a session of its own. */
	function spawnDetached(script: string): number {
		const result = spawnSync('bash', ['-c', `setsid bash -c '${script}' >/dev/null 2>&1 & echo $!`], {
			encoding: 'utf8'
		});
		const pid = Number(result.stdout.trim());
		started.push(pid);
		return pid;
	}

	const alive = (pid: number) => {
		try {
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	};
	// A killed process is still there until whoever adopted it has reaped it.
	const goneWithin = (pid: number, ms = 2000) => {
		for (let waited = 0; waited < ms && alive(pid); waited += 20) {
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
		}
		return !alive(pid);
	};

	// The table names only the throwaway pids: the real one has the live run's
	// servers in it, which this must never be able to reach.
	const reap = (table: string[]) =>
		spawnSync(
			'bash',
			[
				'-c',
				`source "${resolve(__dirname, '../../scripts/lib/output.sh')}"
				 source "${LIB}"
				 reap_leftover_test_servers "$1"`,
				'bash',
				String(NOW)
			],
			{ encoding: 'utf8', env: { ...process.env, TS_PROCESS_TABLE: table.join('\n') } }
		);

	it('stops a leftover server and says how much it freed', () => {
		const pid = spawnDetached('exec sleep 60');

		const result = reap([proc(pid, EARLIER, 745 * 1024, vite(3215, 'site.unipa'))]);

		expect(goneWithin(pid)).toBe(true);
		expect(result.stdout).toContain('745 MB');
	});

	it('stops a leftover test-all without letting its exit trap run', () => {
		// The trap is what would start the staging containers again, from the
		// state file the run going on now is keeping.
		const marker = resolve(tmpdir(), `reap-trap-${process.pid}`);
		rmSync(marker, { force: true });
		const pid = spawnDetached(`trap "touch ${marker}" TERM EXIT; while :; do sleep 1; done`);

		reap([proc(pid, EARLIER, 904, `bash ${ROOT}/scripts/test-all.sh bdd`)]);

		expect(goneWithin(pid)).toBe(true);
		expect(existsSync(marker)).toBe(false);
	});

	it("leaves a process of the run's own session alone", () => {
		const pid = spawnDetached('exec sleep 60');

		reap([proc(pid, NOW, 745 * 1024, vite(3301, 'test.w1'))]);

		expect(alive(pid)).toBe(true);
	});
});
