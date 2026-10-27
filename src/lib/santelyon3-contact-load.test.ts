import { afterEach, describe, it, expect, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { skvarSource } from './skvarSource';

/**
 * What the contact page's load does when the facility cannot be fetched.
 *
 * It used to do nothing: the response was read only `if (response.ok)`, so a
 * 404 left `facility` undefined and the load returned successfully. The page
 * guards its whole body on `{#if data.facility}`, so what shipped was a blank
 * page — 200, no error, nothing on screen, and the only trace a console line
 * no visitor reads.
 *
 * That is how a slug that exists on dev but not on staging reached staging
 * unnoticed. The slug is hardcoded per site while the data behind it is not,
 * so the two can disagree; when they do, the page has to say so.
 *
 * Lives here rather than beside the page: that page is in the skvar submodule,
 * which is a separate repository per site and carries no test setup.
 *
 * That submodule is one branch per tenant, and only Lyon 3's has a /contact
 * route. These tests used to import it from the working tree and skip when it
 * was absent, which made "does Lyon 3's contact page handle a 404" a question
 * about which branch the submodule happened to be on: run on a Lyon 3
 * checkout, silently skipped on any other, and reported as five green skips
 * either way. A test that only runs in some checkouts is not a test of the
 * thing, it is a test of the checkout.
 *
 * So the module is read through skvarSource and evaluated here: test-all's
 * snapshot when the run was started on Lyon 3, the working tree on a Lyon 3
 * checkout, the committed branch otherwise. Lyon 3's contact page is checked
 * on every run, whichever tenant the submodule is sitting on, and at the
 * version under test — reading the branch alone missed a snapshot's
 * uncommitted edits on every tenant but Lyon 3's. The route imports only
 * `@sveltejs/kit` and `$lib` modules, which resolve from this repository
 * regardless of branch, so nothing else has to be stubbed.
 *
 * The load runs on the server for each request (+page.server.ts): the contact
 * person it also fetches is filtered by the backend according to the visitor's
 * role, so it has to be asked for with the visitor's own session. Unlike the
 * facility, a contact person who cannot be loaded is left out rather than
 * failing the page: the address is what a visitor came for.
 */

/** A fetch that answers every request with this status. */
const fetchReturning = (status: number, body: unknown = {}) =>
	vi.fn(async () =>
		new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	) as unknown as typeof fetch;

const ROUTE_FILE = 'contact/+page.server.ts';

/**
 * The page's `load`, compiled from that source.
 *
 * When the route is in the working tree it is imported where it lies. When it
 * has to come from git, the source is written to a scratch file under
 * node_modules/, for two reasons.
 *
 * Not in src/routes: `+` is reserved by SvelteKit, which rejects any
 * unrecognised `+name` there — `+page.from-git.ts` included — so a temporary
 * file breaks `svelte-kit sync` for the whole repository, not just this test.
 *
 * Not in src/ at all, which is where this used to write: four tests walk that
 * tree looking for source files (appUrl, roles, select-wrapper,
 * authFormActions), vitest runs them in workers concurrent with this one, and a
 * file that appears and is deleted mid-walk makes them fail with ENOENT on a
 * path they had just listed. That failure names neither this test nor the rule
 * the walker checks, so it reads as a bug in unrelated code.
 *
 * So: a gitignored scratch directory at the project root, alongside the other
 * ones the suites already keep there (.features-gen, .vitest-attachments,
 * test-results). Those walkers all root at src/ and never climb above it, so
 * nothing there is in their way. It stays inside the project root rather than
 * going to os.tmpdir() because Vite only serves files from within the root, and
 * this module's `$lib` and `@sveltejs/kit` imports have to resolve.
 *
 * The specifier is built at runtime rather than written as a literal, so
 * svelte-check does not try to resolve a file that exists only while this test
 * runs and report a "cannot find module" nobody can act on. The name carries
 * the pid so concurrent vitest workers cannot delete each other's copy.
 */
async function loadContactPage() {
	const page = skvarSource('santelyon3.fr', ROUTE_FILE);
	const spec = (absolute: string) =>
		/* @vite-ignore */ `./${relative(`${__dirname}/`, absolute)}`;

	if (page.workingTreeFile) return (await import(spec(page.workingTreeFile))).load;

	const scratch = resolve(__dirname, '../../.vitest-scratch');
	mkdirSync(scratch, { recursive: true });
	const temp = join(scratch, `contact-page.from-git.${process.pid}.ts`);
	writeFileSync(temp, page.source);
	try {
		return (await import(spec(temp))).load;
	} finally {
		rmSync(temp, { force: true });
	}
}

const contactLoad = await loadContactPage();

/** The visitor's session, as SvelteKit hands the cookies to the load. */
const cookies = { getAll: () => [{ name: 'authjs.session-token', value: 'visitor-session' }] };

/**
 * load() asks for the facility through the event's fetch and for the contact
 * person through the global one, carrying the session as the entry page does,
 * so both are pointed at the same fake API.
 */
const run = (fetchFn: typeof globalThis.fetch) => {
	vi.stubGlobal('fetch', fetchFn);
	return (contactLoad as any)({ fetch: fetchFn, cookies });
};

afterEach(() => {
	vi.unstubAllGlobals();
});

const urlOf = (input: RequestInfo | URL) =>
	typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/** A fake API answering by path: the first route the URL contains, else 404. */
const api = (routes: Record<string, () => Response>) =>
	vi.fn(async (input: RequestInfo | URL) => {
		const url = urlOf(input);
		for (const [path, answer] of Object.entries(routes)) {
			if (url.includes(path)) return answer();
		}
		return new Response('{}', { status: 404 });
	}) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

const json = (body: unknown, status = 200) => () =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('the contact page load', () => {
	it('returns the facility when the slug resolves', async () => {
		const facility = { uid: 'abc', name: 'Coordination', slug: 'coordination-cpts-lyon-3' };
		const result = await run(fetchReturning(200, facility));
		expect(result.facility).toMatchObject({ slug: 'coordination-cpts-lyon-3' });
	});

	it('throws when the slug does not exist, rather than returning nothing', async () => {
		// The failure that shipped. Returning `{ facility: undefined }` here is
		// what produced a blank page instead of an error.
		await expect(run(fetchReturning(404))).rejects.toMatchObject({ status: 404 });
	});

	it('throws when the API is unwell', async () => {
		await expect(run(fetchReturning(500))).rejects.toMatchObject({ status: 500 });
	});

	it('says which slug and which url failed', async () => {
		// A build that fails has to say enough to fix it. "Not found" alone leaves
		// you guessing which of a dozen sites, and which slug, was wrong.
		const error = await run(fetchReturning(404)).catch((e: unknown) => e);
		const text = JSON.stringify(error);
		expect(text).toContain('coordination-cpts-lyon-3');
	});

	it('throws when the request itself fails', async () => {
		// A build cannot reach the API at all: DNS, TLS, the host being down. That
		// has to fail the build too, not pass silently.
		const failing = vi.fn(async () => {
			throw new TypeError('fetch failed');
		}) as unknown as typeof globalThis.fetch;
		await expect(run(failing)).rejects.toBeTruthy();
	});
});

describe('the contact person on the contact page', () => {
	const facility = json({ uid: 'f1', slug: 'coordination-cpts-lyon-3' });
	const person = { uid: 'e1', name: 'Camille Bordagaray' };

	it('is returned as the backend gave it for this visitor', async () => {
		const result = await run(api({ 'facilities-slug': facility, 'fullentries/slug/': json(person) }));
		expect(result.contact).toMatchObject(person);
	});

	it('is asked for with the visitor session, so the backend can filter by role', async () => {
		const fetch = api({ 'facilities-slug': facility, 'fullentries/slug/': json(person) });
		await run(fetch);
		const request = fetch.mock.calls
			.map((call) => call[0] as RequestInfo | URL)
			.find((input) => urlOf(input).includes('fullentries/slug/')) as Request;
		expect(request.headers.get('cookie')).toBe('authjs.session-token=visitor-session');
	});

	it('is found under its new slug after a recorded rename', async () => {
		const result = await run(
			api({
				'facilities-slug': facility,
				'fullentries/slug/renamed-slug': json(person),
				'entry-slugs/': json({ uid: 'e1', slug: 'renamed-slug' })
			})
		);
		expect(result.contact).toMatchObject(person);
	});

	it('is left out, without failing the page, when the backend errors', async () => {
		const result = await run(api({ 'facilities-slug': facility, 'fullentries/slug/': json({}, 500) }));
		expect(result.facility).toMatchObject({ slug: 'coordination-cpts-lyon-3' });
		expect(result.contact).toBeNull();
	});

	it('is left out when its slug leads nowhere', async () => {
		const result = await run(api({ 'facilities-slug': facility }));
		expect(result.facility).toBeTruthy();
		expect(result.contact).toBeNull();
	});

	it('is left out when the request itself fails', async () => {
		const result = await run(
			api({
				'facilities-slug': facility,
				'fullentries/slug/': () => {
					throw new TypeError('fetch failed');
				}
			})
		);
		expect(result.facility).toBeTruthy();
		expect(result.contact).toBeNull();
	});
});
