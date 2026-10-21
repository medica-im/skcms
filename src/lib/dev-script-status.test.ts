import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * dev.sh says which dev server is running, and with what.
 *
 * One site runs at a time, on its own port from dev.yml, and three things
 * have to agree for it to work: the server on that port, the .env it was
 * started with, and the skvar branch checked out. Vite reads .env only when it
 * starts, and a switch interrupted between relinking .env and restarting
 * leaves a server rendering one site with the routes of another -- the
 * "renders, then dies on hydration" failure. So:
 *
 * * `dev.sh --list` marks the context whose server is up;
 * * `dev.sh` alone says what runs, what .env and skvar branch are in place,
 *   warns when they disagree, and names the test servers left running
 *   (e2e workers, test-all's site servers), which hold memory unseen.
 *
 * A port held by something that is not Vite is "busy", never "running".
 */
const script = resolve(__dirname, '../../scripts/dev.sh');

let dir: string;
let servers: ChildProcess[] = [];

async function freePort(): Promise<number> {
	return new Promise((done) => {
		const probe = createServer().listen(0, '127.0.0.1', () => {
			const { port } = probe.address() as { port: number };
			probe.close(() => done(port));
		});
	});
}

/** A process listening on `port`; "vite" in its command line unless told otherwise. */
async function listen(port: number, name = 'vite'): Promise<ChildProcess> {
	const child = spawn(
		process.execPath,
		['-e', `require('net').createServer().listen(${port}, '127.0.0.1', () => console.log('up'))`, name],
		{ stdio: ['ignore', 'pipe', 'inherit'] }
	);
	servers.push(child);
	await new Promise((done) => child.stdout!.once('data', done));
	return child;
}

function run(...args: string[]) {
	const result = spawnSync('bash', [script, ...args], {
		encoding: 'utf8',
		env: {
			...process.env,
			DEV_FILE: join(dir, 'dev.yml'),
			ENV_LINK: join(dir, '.env'),
			SKVAR_DIR: join(dir, 'skvar'),
			E2E_PORTS: `${ports.e2e}-${ports.e2e}`,
			TEST_ALL_PORT_OFFSET: String(ports.testAllOffset)
		}
	});
	return { out: result.stdout, err: result.stderr, status: result.status };
}

const ports = { lyon3: 0, gadagne: 0, e2e: 0, testAllOffset: 0 };

beforeEach(async () => {
	dir = mkdtempSync(join(tmpdir(), 'dev-sh-'));
	ports.lyon3 = await freePort();
	ports.gadagne = await freePort();
	ports.e2e = await freePort();
	ports.testAllOffset = (await freePort()) - ports.lyon3;
	writeFileSync(
		join(dir, 'dev.yml'),
		`contexts:
  - name: lyon3
    development_skvar_branch: santelyon3.fr
    production_skvar_branch: santelyon3.fr
    env_file: .env.dev.santelyon3.fr
    port: ${ports.lyon3}
  - name: gadagne
    development_skvar_branch: sante-gadagne.fr
    production_skvar_branch: sante-gadagne.fr
    env_file: .env.dev.sante-gadagne.fr
    port: ${ports.gadagne}
`
	);
	symlinkSync('.env.dev.santelyon3.fr', join(dir, '.env'));
	spawnSync('git', ['init', '-q', '-b', 'santelyon3.fr', join(dir, 'skvar')]);
});

afterEach(() => {
	for (const server of servers) server.kill();
	servers = [];
	rmSync(dir, { recursive: true, force: true });
});

const line = (out: string, start: string) => out.split('\n').find((l) => l.trimStart().startsWith(start)) ?? '';

describe('dev.sh --list', () => {
	it('marks the context whose server is running, with its pid', async () => {
		const server = await listen(ports.lyon3);
		const { out, status } = run('--list');
		expect(status).toBe(0);
		expect(line(out, 'lyon3')).toMatch(new RegExp(`${ports.lyon3}\\s+● running \\(pid ${server.pid}, up `));
		expect(line(out, 'gadagne')).not.toMatch(/running/);
	});

	it('calls a port held by something else busy, not running', async () => {
		await listen(ports.gadagne, 'postgres');
		const { out } = run('--list');
		expect(line(out, 'gadagne')).toMatch(/busy/);
		expect(line(out, 'gadagne')).not.toMatch(/running/);
	});
});

describe('dev.sh with no site named', () => {
	it('says what runs, with which .env and skvar branch', async () => {
		const server = await listen(ports.lyon3);
		const { out, status } = run();
		expect(status).toBe(0);
		expect(line(out, 'running')).toMatch(new RegExp(`lyon3 on :${ports.lyon3} \\(pid ${server.pid}, up `));
		expect(line(out, '.env')).toContain('.env.dev.santelyon3.fr (lyon3)');
		expect(line(out, 'skvar')).toContain('santelyon3.fr (lyon3)');
		expect(out).not.toMatch(/warning:/);
	});

	it('says when nothing runs', () => {
		expect(line(run().out, 'running')).toMatch(/none/);
	});

	it('warns when .env names another site than the one running', async () => {
		await listen(ports.lyon3);
		rmSync(join(dir, '.env'));
		symlinkSync('.env.dev.sante-gadagne.fr', join(dir, '.env'));
		const { out } = run();
		expect(out).toMatch(/warning: .env is gadagne's, the server on :\d+ is lyon3/);
	});

	it("warns when the skvar branch is not the running site's", async () => {
		await listen(ports.gadagne);
		rmSync(join(dir, '.env'));
		symlinkSync('.env.dev.sante-gadagne.fr', join(dir, '.env'));
		const { out } = run();
		expect(out).toMatch(/warning: skvar is on santelyon3\.fr, gadagne develops on sante-gadagne\.fr/);
	});

	it('names the test servers left running', async () => {
		await listen(ports.e2e);
		await listen(ports.lyon3 + ports.testAllOffset);
		const { out } = run();
		expect(line(out, 'test')).toContain(`:${ports.e2e} (e2e worker)`);
		expect(line(out, 'test')).toContain(`:${ports.lyon3 + ports.testAllOffset} (test-all lyon3)`);
	});

	it('still shows how to switch site', () => {
		expect(run().out).toMatch(/Usage: .*dev\.sh <name>/);
	});
});
