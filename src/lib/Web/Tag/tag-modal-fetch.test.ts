import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * How TagModal reaches the tags of a chosen category.
 *
 * It hand-built the URL as `${ORIGIN}/api/v2/tags?category=...` and fetched it
 * directly. In the browser ORIGIN is `base` (see appUrl.ts) — '' on a site
 * served at its own root, and `/annuaire` on unipa, which is served under one
 * behind WordPress. The API is not under that prefix: /annuaire/api/v2/tags
 * answers 500 while /api/v2/tags returns the five mentions IPA.
 *
 * So the tag dropdown was empty on exactly one site, and silently — the
 * failure path was `console.error(status); return`, which leaves the choices
 * undefined and says nothing on screen. The category dropdown kept working
 * because it goes through a remote function, which is the pattern this pins.
 *
 * Checked as source: the component's fetch is a browser-side call inside a
 * dialog, and the thing that was wrong is which URL it names.
 */
const modal = readFileSync(resolve(__dirname, 'TagModal.svelte'), 'utf8');
const remote = readFileSync(resolve(__dirname, '../../../tag.remote.ts'), 'utf8');

describe('TagModal fetching a category\'s tags', () => {
	it('does not build an API url from ORIGIN', () => {
		// ORIGIN is `base` in the browser, and the API does not live under it.
		expect(modal).not.toMatch(/\$\{ORIGIN\}\/api/);
	});

	it('does not fetch the tags endpoint by hand at all', () => {
		expect(modal).not.toMatch(/fetch\([^)]*api\/v2\/tags/);
	});

	it('asks a remote function for them, like it already does for categories', () => {
		expect(modal).toMatch(/getTagCategories/);
		expect(modal).toMatch(/getTags/);
	});

	it('has a getTags remote function reaching the API through BASE_URI', () => {
		expect(remote).toMatch(/export const getTags\s*=\s*query\(/);
		const body = remote.slice(remote.indexOf('export const getTags'));
		expect(body).toMatch(/\$\{variables\.BASE_URI\}\/api\/v2\/tags/);
	});

	it('takes no argument, because the entry page renders with ssr = false', () => {
		// A query that takes one is unusable there: with no server pass to
		// serialise the argument the client sends the request bare, and the
		// schema rejects it as "expected string, received undefined" before the
		// handler runs. The whole tag list is small enough to filter client-side.
		const body = remote.slice(remote.indexOf('export const getTags'));
		expect(body).toMatch(/export const getTags\s*=\s*query\(async/);
	});
});
