import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Which commit runs where: the backend and every frontend, on dev, staging and
 * production.
 *
 * A server only knows its images as :latest, so the commit is recovered by
 * matching the running image's registry digest against the immutable tags of
 * the images built on this machine (`<sha>` for the backend,
 * `<sha>-<skvar sha>[-dirty]` for a frontend). A frontend image also carries
 * git.sha / git.submodule.sha labels, used when no local tag is left; the
 * backend carries none, so without a tag it is unknown rather than guessed.
 * Hosts and environments come from images.yml: a host serving staging.* sites
 * is staging, any other is production. One ssh per host, and a host that does
 * not answer is reported without hiding the others.
 */

const SCRIPT = resolve(__dirname, '../../scripts/versions.sh');

let dir: string;
let frontend: string;
let skvar: string;
let backend: string;
let fixtures: string;
let clock = 1_700_000_000;

const gitEnv = () => ({
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'Test',
	GIT_AUTHOR_EMAIL: 'test@example.org',
	GIT_COMMITTER_NAME: 'Test',
	GIT_COMMITTER_EMAIL: 'test@example.org'
});
const git = (cwd: string, ...args: string[]) =>
	execFileSync('git', args, {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, ...gitEnv() },
		stdio: 'pipe'
	}).trim();

/** A commit with its own, strictly later, date; returns its full sha. */
function commit(repo: string, subject: string): string {
	clock += 60;
	const date = `@${clock} +0000`;
	writeFileSync(join(repo, 'file'), `${subject}\n`);
	git(repo, 'add', '-A');
	execFileSync('git', ['commit', '-q', '-m', subject], {
		cwd: repo,
		env: { ...process.env, ...gitEnv(), GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
		stdio: 'pipe'
	});
	return git(repo, 'rev-parse', 'HEAD');
}

function repo(name: string, branch: string): string {
	const path = join(dir, name);
	mkdirSync(path);
	git(path, 'init', '-q', '-b', branch);
	return path;
}

const short = (sha: string) => sha.slice(0, 7);
const digest = (n: number) => `sha256:${String(n).padStart(64, '0')}`;

const IMAGES_YML = `images:
  - name: site.fr
    skvar_branch: site.fr
    tag: ghcr.io/medica-im/site.fr:latest
    host: prod
  - name: staging.site.fr
    origin: https://staging.example.org/annuaire
    skvar_branch: site.fr
    tag: ghcr.io/medica-im/staging.site.fr:latest
    host: stage
`;

/** What `docker images` on this machine knows: tag, id, digest. */
function localImages(lines: [string, number][]) {
	writeFileSync(
		join(fixtures, 'local-images.tsv'),
		lines.map(([tag, n]) => `${tag}\t${digest(n)}\t${digest(n)}`).join('\n') + '\n'
	);
}

type Container = { image: string; digest: number; sha?: string; sub?: string; created?: string };

/** What the host's own docker reports for its running containers. */
function host(name: string, containers: Container[]) {
	writeFileSync(
		join(fixtures, `${name}.tsv`),
		containers
			.map((c) =>
				[
					c.image,
					`${c.image.split(':')[0]}@${digest(c.digest)}`,
					c.sha ?? '',
					c.sub ?? '',
					c.created ?? '2026-10-19T20:19:45Z'
				].join('\t')
			)
			.join('\n') + '\n'
	);
}

type Row = {
	env: string;
	component: string;
	host: string;
	commit: string;
	skvar: string;
	dirty: string;
	behind: string;
	skvarBehind: string;
	state: string;
	deployed: string;
	subject: string;
};

function run(...args: string[]): string {
	return runWith({ NO_COLOR: '1' }, ...args);
}

function runWith(extra: Record<string, string>, ...args: string[]): string {
	const env: Record<string, string | undefined> = { ...process.env };
	delete env.NO_COLOR;
	delete env.FORCE_COLOR;
	return execFileSync('bash', [SCRIPT, ...args], {
		encoding: 'utf8',
		stdio: 'pipe',
		env: {
			...env,
			...gitEnv(),
			...extra,
			COLUMNS: '160',
			IMAGES_FILE: join(dir, 'images.yml'),
			FRONTEND_DIR: frontend,
			SKVAR_DIR: skvar,
			BACKEND_DIR: backend,
			VERSIONS_SSH: join(fixtures, 'fake-ssh'),
			VERSIONS_LOCAL_IMAGES: join(fixtures, 'local-images.tsv')
		}
	});
}

function rows(): Row[] {
	return run('--tsv')
		.trim()
		.split('\n')
		.map((line) => {
			const [env, component, host, commit, skvar, dirty, behind, skvarBehind, state, deployed, subject] =
				line.split('\t');
			return { env, component, host, commit, skvar, dirty, behind, skvarBehind, state, deployed, subject };
		});
}
const row = (env: string, component: string) => {
	const found = rows().find((r) => r.env === env && r.component === component);
	if (!found) throw new Error(`no row ${env}/${component} in:\n${run('--tsv')}`);
	return found;
};

const BACKEND = 'ghcr.io/medica-im/clinic-cms-backend';

let f1: string, f2: string, s1: string, s2: string, b1: string, b2: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'versions-'));
	fixtures = join(dir, 'fixtures');
	mkdirSync(fixtures);
	writeFileSync(join(dir, 'images.yml'), IMAGES_YML);
	writeFileSync(
		join(fixtures, 'fake-ssh'),
		[
			'#!/usr/bin/env bash',
			'cat >/dev/null',
			`f="${fixtures}/$1.tsv"`,
			'[[ -f "$f" ]] || { echo "ssh: connect to host $1: Connection timed out" >&2; exit 255; }',
			'cat "$f"',
			''
		].join('\n')
	);
	chmodSync(join(fixtures, 'fake-ssh'), 0o755);

	frontend = repo('skcms', 'main');
	f1 = commit(frontend, 'frontend one');
	f2 = commit(frontend, 'frontend two');
	skvar = repo('skvar', 'site.fr');
	s1 = commit(skvar, 'skvar one');
	s2 = commit(skvar, 'skvar two');
	backend = repo('backend', 'production');
	b1 = commit(backend, 'backend one');
	b2 = commit(backend, 'backend two');

	localImages([
		[`${BACKEND}:${short(b1)}`, 1],
		[`${BACKEND}:${short(b2)}`, 2],
		[`ghcr.io/medica-im/site.fr:${short(f2)}-${short(s2)}`, 10],
		[`ghcr.io/medica-im/site.fr:${short(f1)}-${short(s2)}`, 11],
		[`ghcr.io/medica-im/site.fr:${short(f2)}-${short(s2)}-dirty`, 12],
		[`ghcr.io/medica-im/staging.site.fr:${short(f1)}-${short(s1)}`, 20]
	]);
	host('prod', [
		{ image: `${BACKEND}:latest`, digest: 2 },
		{ image: 'ghcr.io/medica-im/site.fr:latest', digest: 10, sha: f2, sub: s2 }
	]);
	host('stage', [
		{ image: `${BACKEND}:latest`, digest: 1 },
		{ image: 'ghcr.io/medica-im/staging.site.fr:latest', digest: 20, sha: f1, sub: s1 }
	]);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('versions.sh: the backend', () => {
	it("names the backend's commit by matching the running image's digest to a local tag", () => {
		const r = row('production', 'backend');
		expect(r.commit).toBe(short(b2));
		expect(r.state).toBe('current');
		expect(r.subject).toBe('backend two');
	});

	it('counts how far a backend is behind its branch', () => {
		const r = row('staging', 'backend');
		expect(r.commit).toBe(short(b1));
		expect(r.behind).toBe('1');
		expect(r.state).toBe('behind');
	});

	it('says when its container was started, though its image has no labels', () => {
		host('prod', [{ image: `${BACKEND}:latest`, digest: 2, created: '2026-10-19T16:59:13Z' }]);
		const r = row('production', 'backend');
		expect(r.deployed).toMatch(/^2026-10-19 \d\d:59$/);
		expect(r.commit).toBe(short(b2));
	});

	it('says unknown, not a guess, when no local tag names the running image', () => {
		host('prod', [{ image: `${BACKEND}:latest`, digest: 99 }]);
		const r = row('production', 'backend');
		expect(r.state).toBe('unknown');
		expect(r.commit).toBe('-');
	});
});

describe('versions.sh: a frontend', () => {
	it('is current when its image is at the tip of both main and its skvar branch', () => {
		const r = row('production', 'site.fr');
		expect([r.commit, r.skvar, r.state]).toEqual([short(f2), short(s2), 'current']);
	});

	it('counts main and its skvar branch separately', () => {
		const r = row('staging', 'staging.site.fr');
		expect([r.behind, r.skvarBehind, r.state]).toEqual(['1', '1', 'behind']);
	});

	it('says dirty when the image was built from uncommitted changes', () => {
		host('prod', [{ image: 'ghcr.io/medica-im/site.fr:latest', digest: 12, sha: f2, sub: s2 }]);
		const r = row('production', 'site.fr');
		expect(r.dirty).toBe('1');
		expect(r.state).toBe('dirty');
	});

	it("falls back to the image's labels when no local tag is left", () => {
		host('prod', [{ image: 'ghcr.io/medica-im/site.fr:latest', digest: 98, sha: f1, sub: s2 }]);
		const r = row('production', 'site.fr');
		expect([r.commit, r.skvar, r.behind]).toEqual([short(f1), short(s2), '1']);
	});

	it('takes its subject from the newer of its two commits', () => {
		const s3 = commit(skvar, 'skvar three');
		const f3 = commit(frontend, 'frontend three');
		localImages([
			[`ghcr.io/medica-im/site.fr:${short(f2)}-${short(s3)}`, 30],
			[`ghcr.io/medica-im/staging.site.fr:${short(f3)}-${short(s3)}`, 31]
		]);
		host('prod', [{ image: 'ghcr.io/medica-im/site.fr:latest', digest: 30 }]);
		host('stage', [{ image: 'ghcr.io/medica-im/staging.site.fr:latest', digest: 31 }]);
		expect(row('production', 'site.fr').subject).toBe('skvar: skvar three');
		expect(row('staging', 'staging.site.fr').subject).toBe('frontend three');
	});

	it('says so when the images file lists a site its host is not running', () => {
		host('prod', [{ image: `${BACKEND}:latest`, digest: 2 }]);
		expect(row('production', 'site.fr').state).toBe('not-running');
	});
});

describe('versions.sh: hosts and environments', () => {
	it('files a host under staging when it serves staging.* sites, otherwise production', () => {
		const envs = rows().map((r) => `${r.env}/${r.component}@${r.host}`);
		expect(envs).toContain('staging/backend@stage');
		expect(envs).toContain('staging/staging.site.fr@stage');
		expect(envs).toContain('production/backend@prod');
		expect(envs).toContain('production/site.fr@prod');
	});

	it('reports a host that does not answer, and still shows the others', () => {
		rmSync(join(fixtures, 'stage.tsv'));
		expect(row('staging', 'staging.site.fr').state).toBe('unreachable');
		expect(row('staging', 'backend').state).toBe('unreachable');
		expect(row('production', 'site.fr').state).toBe('current');
	});
});

describe('versions.sh: dev', () => {
	it('shows the working trees: skcms with the checked-out skvar branch, and the backend', () => {
		const fe = row('dev', 'frontend (site.fr)');
		expect([fe.commit, fe.skvar, fe.state]).toEqual([short(f2), short(s2), 'current']);
		expect(row('dev', 'backend').commit).toBe(short(b2));
	});

	it('says dirty when a working tree has uncommitted changes', () => {
		writeFileSync(join(backend, 'file'), 'edited\n');
		expect(row('dev', 'backend').state).toBe('dirty');
	});
});

describe('versions.sh: the display', () => {
	it('shows dev, staging and production in that order, each commit with its subject', () => {
		const out = run();
		const order = ['dev', 'staging', 'production'].map((e) => out.indexOf(`╭─ ${e} `));
		expect(order.every((i) => i >= 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
		expect(out).toContain(short(b2));
		expect(out).toContain('backend two');
	});

	it("paints every commit at its tip in the tips' colour, and no other", () => {
		const out = runWith({ FORCE_COLOR: '1' });
		const lines = out.split('\n');
		const header = lines.find((l) => l.includes('skcms main')) ?? '';
		const colour = header.match(new RegExp(`(\\x1b\\[[0-9;]*m)${short(f2)}`))?.[1];
		expect(colour).toBeDefined();
		const painted = (sha: string) => out.includes(`${colour}${sha}`);
		const table = lines.filter((l) => l.includes('│')).join('\n');
		const paintedInTable = (sha: string) => table.includes(`${colour}${sha}`);

		expect(painted(short(b2))).toBe(true);
		expect(paintedInTable(short(f2))).toBe(true);
		expect(paintedInTable(short(s2))).toBe(true);
		expect(paintedInTable(short(b2))).toBe(true);
		expect(paintedInTable(short(f1))).toBe(false);
		expect(paintedInTable(short(s1))).toBe(false);
		expect(paintedInTable(short(b1))).toBe(false);
	});

	it('shows each site as the whole URL where it answers, which any terminal can open', () => {
		const table = run()
			.split('\n')
			.filter((l) => l.includes('│'));
		const first = (url: string) => table.some((l) => l.startsWith(` │ ${url} `));
		expect(first('https://site.fr')).toBe(true);
		expect(first('https://staging.example.org/annuaire')).toBe(true);
		expect(runWith({ FORCE_COLOR: '1' })).not.toContain('\x1b]8;;');
	});

	it('boxes each host apart, the one named like its environment first', () => {
		writeFileSync(
			join(dir, 'images.yml'),
			`${IMAGES_YML}  - name: other.fr
    skvar_branch: site.fr
    tag: ghcr.io/medica-im/other.fr:latest
    host: other.example.org
`.replace(/host: prod$/m, 'host: production')
		);
		host('other.example.org', [
			{ image: `${BACKEND}:latest`, digest: 1 },
			{ image: 'ghcr.io/medica-im/other.fr:latest', digest: 10 }
		]);
		host('production', [{ image: 'ghcr.io/medica-im/site.fr:latest', digest: 10 }]);
		const boxes = run()
			.split('╭─ ')
			.slice(1)
			.map((b) => ({ title: b.split(' ─')[0], body: b }));
		expect(boxes.map((b) => b.title)).toEqual(['dev', 'staging · stage', 'production', 'production · other']);
		const box = (title: string) => boxes.find((b) => b.title === title)?.body ?? '';
		expect(box('production')).toContain('https://site.fr');
		expect(box('production')).not.toContain('https://other.fr');
		expect(box('production · other')).toContain('https://other.fr');
		expect(box('production · other')).toContain(short(b1));
		expect(row('production', 'other.fr').host).toBe('other.example.org');
	});

	it('gives each tip its commit and subject', () => {
		const lines = run().split('\n');
		const tip = (label: string) => lines.find((l) => l.includes(label)) ?? '';
		expect(tip('skcms main')).toContain(`${short(f2)}  frontend two`);
		expect(tip('backend production')).toContain(`${short(b2)}  backend two`);
	});
});
