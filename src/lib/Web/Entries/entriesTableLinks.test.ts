import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Every link the entries table emits actually resolves.
 *
 * EntriesTable.svelte.test.ts asserts each href equals a string, which only
 * restates what the component was written to produce: when the route was
 * guessed wrong, the component and the test agreed with each other and the
 * link 404'd in production. The facility column pointed at
 * /web/facility/{slug} — a path whose only real subroute is `create` — while
 * facilities have always lived at /sites/{slug}, as two other components in
 * this repository already knew.
 *
 * A static walk of src/routes cannot settle this either: the (skvar) tenant
 * tree is [facility=facility]/[type]/[effector], three consecutive parameters
 * that structurally match any three-segment path. Only the `=facility` matcher
 * rejects it, and matchers run at request time.
 *
 * So this asks a running site. It is skipped unless one is reachable, which
 * keeps it out of the way in CI while making it the check that runs before a
 * release — the only kind that can tell a route that exists from a route that
 * merely looks like one.
 */

const BASE = process.env.LINKCHECK_ORIGIN ?? 'https://dev.santelyon3.fr';
const COMPONENT = new URL('./EntriesTable.svelte', import.meta.url).pathname;

/** One live example per link shape the table renders. */
const SAMPLES: Record<string, string> = {
	'/e/': '/e/maurice-dantec-dentiste-69',
	'/sites/': '/sites/cabinet-dentaire-lafayette',
	'/web/users/': '/web/users/cb5927c3072f42b183fb86566556eea3'
};

async function reachable(): Promise<boolean> {
	try {
		const res = await fetch(BASE, { signal: AbortSignal.timeout(3000) });
		return res.ok;
	} catch {
		return false;
	}
}

const online = await reachable();

describe.skipIf(!online)(`links resolve against ${BASE}`, () => {
	it('has a sample for every link shape in the component', () => {
		// Guards the guard: a new column whose links nobody sampled would
		// otherwise pass this file untested.
		const source = readFileSync(COMPONENT, 'utf8');
		const prefixes = [...source.matchAll(/href="(\/[a-z-]+\/(?:[a-z-]+\/)?)/g)].map((m) => m[1]);

		for (const prefix of new Set(prefixes)) {
			expect(Object.keys(SAMPLES), `no sample URL for ${prefix}`).toContain(prefix);
		}
	});

	it.each(Object.entries(SAMPLES))('%s resolves', async (_prefix, path) => {
		const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });

		expect(res.status, `${BASE}${path} returned ${res.status}`).toBe(200);
	});

	it('would have caught the facility link that shipped broken', async () => {
		// The bug this file exists for. Kept as a test so the assertion above
		// is known to be capable of failing.
		const res = await fetch(`${BASE}/web/facility/cabinet-dentaire-lafayette`, {
			signal: AbortSignal.timeout(10_000)
		});

		expect(res.status).toBe(404);
	});
});
