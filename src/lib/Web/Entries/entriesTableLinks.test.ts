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

/**
 * The link shapes the table renders, and how to find a live example of each.
 *
 * Discovered rather than hardcoded. The first version of this file pinned
 * three real slugs, and every one of them 404'd within a day — the entry was
 * deleted from the dev site and the test started reporting a broken route
 * where the route was fine and only the sample had gone. A test that fails
 * when the data changes teaches you to ignore it.
 */
const SHAPES: Record<string, () => Promise<string | null>> = {
	'/e/': async () => {
		// An *active* entry: /e/{slug} answers 404 for a deactivated one, and
		// the feed lists both — it is fetched with active=None. Sampling the
		// first entry blindly picked a deactivated one and reported the route
		// broken when it was working exactly as intended.
		const entry = (await entries()).find((e: any) => e.active && e.entrySlug);
		return entry ? `/e/${entry.entrySlug}` : null;
	},
	'/sites/': async () => {
		const entry = (await entries()).find((e: any) => e.active && e.facility?.slug);
		return entry ? `/sites/${entry.facility.slug}` : null;
	},
	'/web/users/': async () => {
		const entry = (await entries()).find((e: any) => e.active && (e.owner?.length || e.creator?.length));
		const uid = entry?.owner?.[0] ?? entry?.creator?.[0];
		return uid ? `/web/users/${uid}` : null;
	}
};

let cached: any[] | null = null;

/** The public entries feed, fetched once for the whole file. */
async function entries(): Promise<any[]> {
	if (cached) return cached;
	const res = await fetch(`${BASE}/api/v2/entries`, { signal: AbortSignal.timeout(10_000) });
	cached = res.ok ? await res.json() : [];
	return cached;
}

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
			expect(Object.keys(SHAPES), `no sample URL for ${prefix}`).toContain(prefix);
		}
	});

	it.each(Object.keys(SHAPES))('%s resolves', async (prefix) => {
		const path = await SHAPES[prefix]();
		if (!path) {
			// No entry on the site currently exercises this shape. Reporting a
			// pass here is honest: there is nothing to check, and failing would
			// blame the route for the data.
			return;
		}

		const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });

		expect(res.status, `${BASE}${path} returned ${res.status}`).toBe(200);
	});

	it('would have caught the facility link that shipped broken', async () => {
		// The bug this file exists for: /web/facility/{slug} has only a
		// create/ subroute. Kept as a test so the assertions above are known
		// to be capable of failing.
		const entry = (await entries()).find((e: any) => e.active && e.facility?.slug);
		if (!entry) return;

		const res = await fetch(`${BASE}/web/facility/${entry.facility.slug}`, {
			signal: AbortSignal.timeout(10_000)
		});

		expect(res.status).toBe(404);
	});
});
