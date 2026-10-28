/**
 * Every page of a site survives a hard reload.
 *
 * A page reached by client-side navigation and the same page loaded cold are
 * not the same code path: only the cold load renders the component on the
 * server. unipa.fr/annuaire/sites answered 500 on reload while clicking to it
 * worked, so a suite that only navigates never sees that class of error.
 *
 * Each page is loaded in a fresh browser context — a full SSR render and
 * hydration with an empty cache, the same as a first visit. A shared context
 * hands the next map page its tiles from cache, and Playwright never sees
 * those requests finish: every map page after the first waited out the whole
 * network-idle timeout. A page fails on:
 *   - an HTTP status of 400 or more for the document;
 *   - an uncaught exception in the page (hydration errors land here);
 *   - a console error;
 *   - a navigation that times out twice. Once is forgiven and reported: a
 *     check run straight after a release meets servers still warming up.
 *
 * Pages are found by following the site's own links, breadth first, from its
 * root. Dynamic routes are the same code for every slug, and there are
 * hundreds of entries, so each is sampled once (SAMPLED below).
 *
 * Run it against staging as well as dev (SITE_TARGET=staging): staging serves
 * the built Node server, dev serves Vite, and an error that only exists in the
 * bundled SSR shows on staging alone.
 */
import { expect, type Browser } from '@playwright/test';
import { basePathFor, originFor, type SiteName } from './sites';

/**
 * Dynamic routes, one page each. Matched against the path below the base path.
 * Keep in step with the [param] routes under src/routes.
 */
const SAMPLED: { name: string; pattern: RegExp }[] = [
	{ name: '/e/[slug]', pattern: /^\/e\/[^/]+$/ },
	{ name: '/sites/[slug]', pattern: /^\/sites\/[^/]+$/ }
];

/**
 * Not pages, or pages that change the session rather than show something.
 * /blog/ghost is Ghost's admin, which the blog's theme links to ("Connexion"):
 * its API refuses an anonymous visitor, so a crawl would always fail there.
 */
const SKIPPED = [
	/^\/api(\/|$)/,
	/^\/auth(\/|$)/,
	/^\/signin(\/|$)/,
	/^\/signout(\/|$)/,
	/^\/_test(\/|$)/,
	/^\/blog\/ghost(\/|$)/
];

/**
 * Pages known to fail for a reason being sorted out outside the code (data,
 * blog content). Skipped meanwhile, and named in every report so they are not
 * forgotten; per site, so the same path elsewhere is still checked. Remove an
 * entry once its cause is fixed.
 */
const KNOWN_ISSUES: Partial<Record<SiteName, { path: string; why: string }[]>> = {
	'msp-vedene.fr': [
		{ path: '/form/nosmoking', why: 'linked from the blog post « Mois sans tabac »; no such page' }
	]
};

/** Files rather than pages. */
const FILE = /\.(pdf|png|jpe?g|gif|svg|webp|ics|xml|txt|json|zip|docx?|xlsx?)$/i;

/**
 * Where the crawl starts, besides the root: common routes every site has but
 * not every site links to (/contact falls back to a common page). unipa's menu
 * is WordPress's, so nothing in the app leads to /sites or /contact — and both
 * 500ed there.
 */
const SEEDS = ['/', '/sites', '/contact'];

/** A guard against a link pattern that multiplies pages; raise it if a site outgrows it. */
const MAX_PAGES = 80;

type Failure = { url: string; status?: number; errors: string[] };

/**
 * The first active entry of the site, with its facility. The API sits at the
 * origin root, base path or not.
 */
async function sampleEntry(origin: string): Promise<{ entrySlug: string; facilitySlug: string }> {
	const response = await fetch(`${origin}/api/v2/entries`, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(30_000)
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const entries: { active?: boolean; entrySlug?: string; facility?: { slug?: string; uid?: string } }[] =
		await response.json();
	const entry = entries.find((e) => e.active && e.entrySlug && (e.facility?.slug || e.facility?.uid));
	if (!entry) throw new Error(`none of ${entries.length} entries is active with a facility`);
	return { entrySlug: entry.entrySlug!, facilitySlug: entry.facility!.slug || entry.facility!.uid! };
}

/** One cold load of `url` in a fresh context: what failed, and the links it offers. */
async function load(browser: Browser, url: string) {
	const context = await browser.newContext();
	const page = await context.newPage();
	const errors: string[] = [];
	let throttled = false;
	page.on('response', (r) => {
		if (r.status() === 429) throttled = true;
	});
	page.on('pageerror', (e) => errors.push(`exception: ${e.message}`));
	page.on('console', (m) => {
		const where = m.location().url;
		if (m.type() !== 'error' || isAnonymousUserCheck(m.text(), where) || isThirdParty(where, url)) return;
		errors.push(`console: ${m.text()}${where && where !== url ? ` (${where})` : ''}`);
	});

	let status: number | undefined;
	let hrefs: string[] = [];
	try {
		const response = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
		status = response?.status();
		if (status !== undefined && status >= 400) errors.unshift(`HTTP ${status}`);
		// Hydration runs after load; let it finish before reading errors.
		await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
		hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
	} catch (e) {
		errors.push(`navigation: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
	} finally {
		await context.close();
	}
	return { status, errors, hrefs, throttled };
}

const isNavigationTimeout = (error: string) => /^navigation: .*Timeout \d+ms exceeded/.test(error);

/**
 * A logged-out visitor's "who am I": +layout.ts asks /api/v2/users/me in
 * production builds, gets 401, and logs it as an error. Expected for an
 * anonymous crawl, so only that request's 401 and that log line are ignored.
 */
function isAnonymousUserCheck(text: string, location: string): boolean {
	if (/status of 401/.test(text) && /\/api\/v2\/users\/me$/.test(location)) return true;
	return /retrieving user from layout\.ts.*401/.test(text);
}

/**
 * A message logged by somebody else's script: Google Maps on the contact page
 * logs a permissions-policy violation on every load. Not ours to fix, and a
 * check that fails on it every time stops being read -- the same reason the
 * link check forgives other sites' broken links.
 */
function isThirdParty(location: string, pageUrl: string): boolean {
	if (!location) return false;
	try {
		return new URL(location).origin !== new URL(pageUrl).origin;
	} catch {
		return false;
	}
}

export async function reloadEveryPage(browser: Browser, site: SiteName) {
	const origin = originFor(site);
	const base = basePathFor(site);

	const queue = SEEDS.map((path) => `${origin}${base}${path}`);
	const sampled = new Set<string>();
	const known = KNOWN_ISSUES[site] ?? [];
	const skippedKnown = new Set<string>();
	const visited: string[] = [];
	const failures: Failure[] = [];

	// One entry and its facility, taken from the API rather than from links, so
	// the dynamic routes are reloaded even when the page that links to them is
	// the one failing.
	try {
		const sample = await sampleEntry(origin);
		queue.push(`${origin}${base}/e/${sample.entrySlug}`, `${origin}${base}/sites/${sample.facilitySlug}`);
		sampled.add('/e/[slug]').add('/sites/[slug]');
	} catch (e) {
		failures.push({
			url: `${origin}/api/v2/entries`,
			errors: [`no entry to sample /e/[slug] and /sites/[slug]: ${e instanceof Error ? e.message : e}`]
		});
	}
	const seen = new Set<string>(queue);

	/** The page's key, or null when it is not to be visited. */
	const accept = (href: string): string | null => {
		let url: URL;
		try {
			url = new URL(href);
		} catch {
			return null;
		}
		// The site's own production host counts as the site: unipa's menu comes
		// from WordPress and links to https://unipa.fr/annuaire/… wherever the
		// app is served, so on staging nearly every link would be dropped.
		if (url.origin !== origin) {
			if (url.hostname !== site && url.hostname !== `www.${site}`) return null;
			url = new URL(`${url.pathname}${url.search}`, origin);
		}
		// Only the app: on unipa.fr everything outside /annuaire is WordPress.
		if (base && url.pathname !== base && !url.pathname.startsWith(`${base}/`)) return null;
		const path = url.pathname.slice(base.length).replace(/\/$/, '') || '/';
		if (SKIPPED.some((p) => p.test(path)) || FILE.test(path)) return null;
		if (known.some((k) => k.path === path)) {
			skippedKnown.add(path);
			return null;
		}
		const route = SAMPLED.find((s) => s.pattern.test(path));
		if (route) {
			if (sampled.has(route.name)) return null;
			sampled.add(route.name);
		}
		// Query and hash dropped: the directory's filters are query parameters
		// over the same page, and following each would multiply the crawl.
		return `${origin}${base}${path === '/' ? '/' : path}`;
	};

	const slowOnce: string[] = [];
	while (queue.length) {
		const url = queue.shift()!;
		visited.push(url);
		expect(visited.length, `more than ${MAX_PAGES} pages; is a link multiplying?`).toBeLessThanOrEqual(
			MAX_PAGES
		);

		let visit = await load(browser, url);
		// Throttled by the staging nginx (30 r/s per IP, burst 200, shared by
		// every vhost on the box): wait for the bucket to refill and load the
		// page again, rather than report the rate limit as a page error.
		for (let attempt = 0; visit.throttled && attempt < 2; attempt++) {
			await new Promise((r) => setTimeout(r, 10_000));
			visit = await load(browser, url);
		}
		if (visit.errors.some(isNavigationTimeout)) {
			visit = await load(browser, url);
			if (!visit.errors.some(isNavigationTimeout)) slowOnce.push(url);
		}
		const { status, errors, hrefs } = visit;
		if (visit.throttled) errors.push('still rate limited (429) after two pauses');
		for (const href of hrefs) {
			const next = accept(href);
			if (next && !seen.has(next)) {
				seen.add(next);
				queue.push(next);
			}
		}
		if (errors.length) failures.push({ url, status, errors });
	}

	const report = failures
		.map((f) => `${f.url}\n${f.errors.map((e) => `    ${e}`).join('\n')}`)
		.join('\n');
	console.log(`${site}: ${visited.length} pages reloaded\n${visited.map((u) => `  ${u}`).join('\n')}`);
	for (const k of known.filter((k) => skippedKnown.has(k.path))) {
		console.log(`  KNOWN ISSUE, not reloaded: ${k.path} (${k.why})`);
	}
	for (const url of slowOnce) console.log(`  TIMED OUT ONCE, passed on retry: ${url}`);
	expect(failures, `pages that fail on a hard reload:\n${report}`).toEqual([]);
}
