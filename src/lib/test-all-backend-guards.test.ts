import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The two questions test-all's backend stage asks of the compose stack before
 * it runs anything: is neo4j healthy, and is a pytest session already running.
 *
 * On 2026-11-18 both answered wrongly and failed the run without a test
 * executing. The first waited on `backend-neo4j-1`, a name hard-coded for
 * another compose project, so an exited container of that name read
 * `unhealthy` for 180 s while the stack's own neo4j (backend-dev-neo4j-1) was
 * up in 13 s. The second ran `pgrep` in a container that has none, and took
 * the exec error for a running session.
 */

const NEO4J_HEALTH = resolve(__dirname, '../../scripts/neo4j-health.sh');
const PYTEST_RUNNING = resolve(__dirname, '../../scripts/pytest-running.sh');

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'backend-guards-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** An executable stand-in running `body` as a bash script. */
function fake(name: string, body: string): string {
	const file = join(dir, name);
	writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
	chmodSync(file, 0o755);
	return file;
}

describe('neo4j-health.sh', () => {
	const compose = (ps: string) => fake('compose', `[[ "$1 $2" == "ps -q" ]] && printf '%s\\n' '${ps}'`);

	function health(composeCmd: string, dockerCmd: string) {
		const result = spawnSync('bash', [NEO4J_HEALTH, 'neo4j'], {
			encoding: 'utf8',
			env: { ...process.env, COMPOSE: composeCmd, DOCKER: dockerCmd }
		});
		return { code: result.status, out: result.stdout.trim() };
	}

	it("asks the status of the service's own container, whatever it is called", () => {
		const docker = fake(
			'docker',
			// An exited container of the name test-all used to hard-code still exists.
			`case "$2" in abc123) echo healthy;; backend-neo4j-1) echo unhealthy;; *) exit 1;; esac`
		);

		expect(health(compose('abc123'), docker)).toEqual({ code: 0, out: 'healthy' });
	});

	it('passes the status on as it is while the container is still starting', () => {
		const docker = fake('docker', `echo starting`);

		expect(health(compose('abc123'), docker).out).toBe('starting');
	});

	it('says missing when the service has no container', () => {
		const docker = fake('docker', `echo healthy`);

		expect(health(compose(''), docker).out).toBe('missing');
	});
});

describe('pytest-running.sh', () => {
	function running(composeBody: string) {
		const result = spawnSync('bash', [PYTEST_RUNNING, 'fastapi'], {
			encoding: 'utf8',
			env: { ...process.env, COMPOSE: fake('compose', composeBody) }
		});
		return { code: result.status, out: result.stdout.trim(), err: result.stderr };
	}

	/** Runs the probe the script sends into the container, here, on this machine. */
	const locally = String.raw`while [ "$1" != sh ]; do shift; done; exec "$@"`;

	it('exits 1, printing nothing, when no session is running', () => {
		expect(running(locally)).toEqual({ code: 1, out: '', err: '' });
	});

	it('exits 0 and prints the session when one is running', async () => {
		// exec -a gives the process the command line of the real one.
		const session = spawn('bash', ['-c', 'exec -a "python -m pytest -q" sleep 30']);
		try {
			await new Promise((done) => setTimeout(done, 200));

			const { code, out } = running(locally);

			expect(code).toBe(0);
			expect(out).toContain('python -m pytest -q');
		} finally {
			session.kill();
		}
	});

	it('does not take the probe itself for a session', () => {
		// The probe names what it looks for, so its own command line could match it.
		expect(running(locally).code).toBe(1);
	});

	it('exits 2, naming the failure, when the container cannot be asked', () => {
		// The 03:17 run on 2026-11-18: `exec: "pgrep": executable file not found`
		// was printed as if it were a running session.
		const { code, out, err } = running(
			`echo 'OCI runtime exec failed: unable to start container process' >&2; exit 126`
		);

		expect(code).toBe(2);
		expect(out).toBe('');
		expect(err).toContain('OCI runtime exec failed');
	});
});
