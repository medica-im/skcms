import { describe, it, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

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
 * So the module is read from git instead — `git show <branch>:contact/+page.ts`
 * — and evaluated here. Lyon 3's contact page is now checked on every run,
 * whichever tenant the submodule is sitting on. The route imports only
 * `@sveltejs/kit` and `$lib/utils/origin`, both of which resolve from this
 * repository regardless of branch, so nothing else has to be stubbed.
 *
 * The load runs on the server at build time now that the page is prerendered,
 * so throwing here fails the build rather than the visitor's request — which
 * is the point. These tests pin the throwing, not the prerendering.
 */

/** A fetch that answers every request with this status. */
const fetchReturning = (status: number, body: unknown = {}) =>
	vi.fn(async () =>
		new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	) as unknown as typeof fetch;

/**
 * Lyon 3's contact page source, read from whichever branch carries it.
 *
 * Tried in order: the working tree (already on a Lyon 3 checkout), then the
 * tenant branches. Reading from git rather than the filesystem is what makes
 * this independent of the current checkout — the whole point of the change
 * described above.
 */
function contactPageSource(): string {
	const submodule = resolve(__dirname, '../routes/(skvar)');
	const local = join(submodule, 'contact/+page.ts');
	if (existsSync(local)) return readFileSync(local, 'utf8');

	for (const branch of ['santelyon3.fr', 'dev.santelyon3.fr']) {
		try {
			return execFileSync('git', ['show', `${branch}:contact/+page.ts`], {
				cwd: submodule,
				encoding: 'utf8'
			});
		} catch {
			// Branch missing from this clone; try the next.
		}
	}

	throw new Error(
		'Lyon 3 contact/+page.ts is in neither the working tree nor any known ' +
			'skvar branch. The submodule may be unfetched — `git submodule update ' +
			'--init` in this repository, or `git fetch` inside src/routes/(skvar).'
	);
}

/**
 * The page's `load`, compiled from that source.
 *
 * When the route is in the working tree it is imported where it lies. When it
 * has to come from git, the source is written to a scratch file *here* in
 * src/lib rather than into the routes tree: `+` is reserved by SvelteKit, which
 * rejects any unrecognised `+name` under src/routes — `+page.from-git.ts`
 * included — so a temporary file there breaks `svelte-kit sync` for the whole
 * repository, not just for this test. Nothing about the module needs to sit in
 * the routes tree anyway: it imports only `@sveltejs/kit` and `$lib/utils/
 * origin`, and both resolve the same from anywhere under src.
 *
 * The specifier is built at runtime rather than written as a literal, so
 * svelte-check does not try to resolve a file that exists only while this test
 * runs and report a "cannot find module" nobody can act on. The name carries
 * the pid so concurrent vitest workers cannot delete each other's copy.
 */
async function loadContactPage() {
	const real = resolve(__dirname, '../routes/(skvar)/contact/+page.ts');
	const spec = (absolute: string) =>
		/* @vite-ignore */ `./${relative(`${__dirname}/`, absolute)}`;

	if (existsSync(real)) return (await import(spec(real))).load;

	const temp = join(__dirname, `contact-page.from-git.${process.pid}.ts`);
	writeFileSync(temp, contactPageSource());
	try {
		return (await import(spec(temp))).load;
	} finally {
		rmSync(temp, { force: true });
	}
}

const contactLoad = await loadContactPage();

/** load() only ever uses `fetch`, so the rest of the event is not needed. */
const run = (fetch: typeof fetch) => (contactLoad as any)({ fetch });

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
		const fetch = vi.fn(async () => {
			throw new TypeError('fetch failed');
		}) as unknown as typeof fetch;
		await expect(run(fetch)).rejects.toBeTruthy();
	});
});
