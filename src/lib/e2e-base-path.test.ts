import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Page navigation carries the site's base path; API calls do not.
 *
 * The two are genuinely different addresses on an instance served under a
 * prefix. unipa is proxied at /annuaire behind WordPress: its pages live under
 * that prefix and its API does not — /annuaire/api/v2/tags answers 500 while
 * /api/v2/tags returns the tags.
 *
 * The suite conflated them. Every step navigated with a root-relative path
 * (`/e/${slug}`, `/`), which 404s on unipa, so the one site with a base path
 * was the one site the BDD suite could not exercise — and base-path bugs are
 * exactly the class that only appears there.
 *
 * It cannot be fixed through baseURL, the obvious place: `new URL('/e/x',
 * 'https://host/annuaire')` is 'https://host/e/x' — a leading slash resolves
 * against the origin and discards the prefix. So apiOrigin() stays the bare
 * origin (30-odd call sites build API urls from it, and prefixing those would
 * reintroduce the 500), and the `page` fixture prepends siteBasePath() to
 * relative navigations instead — once, so no step has to know.
 */
const root = resolve(__dirname, '../..');
const session = readFileSync(resolve(root, 'tests/fixtures/session.ts'), 'utf8');
const fixtures = readFileSync(resolve(root, 'steps/fixtures.ts'), 'utf8');

describe('the site base path in the BDD suite', () => {
	it('is exposed as its own function, not folded into apiOrigin', () => {
		expect(session).toMatch(/export function siteBasePath\(/);
	});

	it('leaves apiOrigin a bare origin, so API urls keep working', () => {
		// The API is not under the prefix; prefixing here is the bug this whole
		// change exists to stop reintroducing.
		const body = session.slice(session.indexOf('export function apiOrigin'));
		const fn = body.slice(0, body.indexOf('\n}'));
		expect(fn).not.toMatch(/siteBasePath|basePath/);
	});

	it('is prepended by the page fixture, so no step has to know', () => {
		expect(fixtures).toMatch(/siteBasePath\(/);
		expect(fixtures).toMatch(/page\.goto\s*=/);
	});

	it('leaves baseURL a bare origin, since a leading slash would discard it', () => {
		expect(fixtures).toMatch(/use\(apiOrigin\(/);
	});

	it('is read from the site\'s env file rather than hardcoded', () => {
		// Only unipa has one today. A literal '/annuaire' would be wrong for
		// every other site and silently right for one.
		const body = session.slice(session.indexOf('export function siteBasePath'));
		expect(body).toMatch(/BASE_PATH/);
	});

	it('is keyed on the host under test, not on the .env symlink', () => {
		// Reading .env would hand /annuaire to the root-served worker sites
		// whenever a developer had unipa checked out, and 404 every navigation.
		const body = session.slice(session.indexOf('export function siteBasePath'));
		expect(body).toMatch(/apiOrigin\(workerIndex\)|hostname/);
	});
});
