/**
 * Which site a spec is about.
 *
 * Three kinds of spec, and the difference decides both where one lives and how
 * many sites it has to run against. Ask what would have to be re-measured if
 * the spec ran against another site:
 *
 * **1. Tenant-specific — the subject itself differs per site.** The contact
 * page: its markup is in Lyon 3's skvar branch, sante-gadagne has no such
 * route, and measuring its layout anywhere else measures a page that was never
 * meant to be there. These belong here, pinned to their site.
 *
 * **2. Component-only — the subject is the component, and the mount cannot
 * change it.** The svelte-select contrast rule is one shared stylesheet, so it
 * paints the same control wherever the directory is mounted; running it at a
 * second path would cost twice for a result that cannot differ. One venue is
 * enough, and which venue is an implementation detail — see directoryPathFor.
 *
 * **3. Mount-sensitive — the subject involves URLs, so the shape of the mount
 * is itself a variable.** Anything about query parameters, entry links,
 * canonical, or back-navigation. These must run against all three shapes
 * directoryPathFor documents, because two of them put the directory at
 * /annuaire by different means and a link built from the wrong mechanism still
 * looks right on one of them. A single venue here is not coverage, it is a
 * coin flip.
 *
 * The route's group is a hint, not the test, and taking it for the test gets
 * this wrong in both directions. A `(common)` route can still be generic even
 * though it reads one site's data — `/e/[slug]` and `/web/clone` are the same
 * code for every tenant. And a skvar *URL* does not make its subject
 * tenant-specific: the directory is one shared component (CtxDirectory), and
 * which filters it shows is a Postgres-side decision rather than a property of
 * the site's branch.
 *
 * Naming the site rather than a hostname keeps the choice in one place: a site
 * that moves origin is edited here, not in every spec that mentions it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Dev origin per site, matching the .env.dev.<site> files at the repo root. */
export const SITE_ORIGINS = {
	'santelyon3.fr': 'https://dev.santelyon3.fr',
	'sante-gadagne.fr': 'https://dev.sante-gadagne.fr',
	'annuaire.medica.im': 'http://dev.annuaire.medica.im',
	'ipa.medica.im': 'http://dev.ipa.medica.im',
	'sandbox.medica.im': 'http://dev.sandbox.medica.im',
	'ssc.medica.im': 'http://dev.ssc.medica.im',
	// WordPress at the root with only /annuaire proxied to the app; see
	// BASE_PATHS below, and directoryPathFor for why that is not the same thing
	// as santelyon3's /annuaire.
	'unipa.fr': 'https://dev.unipa.fr'
} as const;

export type SiteName = keyof typeof SITE_ORIGINS;

/**
 * The base path a site's app is served under, when it is not the origin root.
 *
 * This is BASE_PATH at build time (`.env.dev.<site>`), which is a property of
 * the *proxy* in front of the app rather than of the directory: unipa.fr is a
 * WordPress site with one subdirectory proxied to clinic-cms, so every URL that
 * instance emits carries the prefix. Baked in at build time and not served by
 * any API, so unlike Setting.path it has to be read from the env file.
 */
const BASE_PATHS: Partial<Record<SiteName, string>> = {
	// Keep in step with BASE_PATH in .env.dev.unipa.fr.
	'unipa.fr': '/annuaire'
};

/**
 * One site per way of mounting the directory, for the mount-sensitive specs
 * (kind 3 at the top of this file) to run against all of them:
 *
 *     for (const { shape, site } of DIRECTORY_MOUNTS) { ... }
 *
 * Three entries because there are three shapes, not because there are three
 * interesting sites: any other site is one of these three again, and adding it
 * would buy a slower suite and no new case. What makes them distinct is *how*
 * the prefix arises, which is why 'subpath' and 'proxied' are both here even
 * though both serve the directory from /annuaire — see directoryPathFor.
 */
export const DIRECTORY_MOUNTS = [
	/** The app is the site and the directory is its root. */
	{ shape: 'root', site: 'annuaire.medica.im' },
	/** A full site whose own /annuaire page renders the directory. */
	{ shape: 'subpath', site: 'santelyon3.fr' },
	/** WordPress at the root, one subdirectory proxied to the app. */
	{ shape: 'proxied', site: 'unipa.fr' }
] as const satisfies readonly { shape: string; site: SiteName }[];

/**
 * Where a site mounts its address book.
 *
 * **Two independent mechanisms, and the whole point of this function is that
 * they compose.** There are three shapes in production:
 *
 *   1. a directory-based site (annuaire.medica.im): the app is the site, and
 *      the directory is its root — Setting.path '', no BASE_PATH;
 *   2. a full site with a directory in it (santelyon3.fr): Setting.path
 *      '/annuaire', still no BASE_PATH;
 *   3. a WordPress site with one subdirectory proxied to the app (unipa.fr):
 *      BASE_PATH '/annuaire', and Setting.path back to '' because the
 *      directory *is* the root of the proxied app.
 *
 * Cases 2 and 3 both put the directory at /annuaire by entirely different
 * means, which is exactly the coincidence that hides a bug: a link built from
 * the wrong one of the two still looks right on unipa. entrySlugPageUrl and
 * friends (src/lib/utils/utils.ts) build from `base`, never from Setting.path,
 * so on case 2 those are unprefixed while the page is not.
 *
 * Setting.path is a Postgres value (directory/models/core.py, "URL path of the
 * directory"), changeable by an operator without touching this repo, so it is
 * asked of the site over the public /api/v1/directory/ endpoint the app itself
 * uses rather than written down here. Which filters the page renders is data in
 * the same way (`inputField` on the same payload), which is why a directory
 * spec must assert on the controls it finds and not on a count it expects.
 *
 * Note the API answers even when the site's *page* server is down — it is
 * proxied to the backend rather than to Vite — so this says where the directory
 * lives, never whether anything is serving it. That is requireSite's job.
 */
export async function directoryPathFor(site: SiteName): Promise<string> {
	const origin = originFor(site);
	const base = BASE_PATHS[site] ?? '';
	const response = await fetch(`${origin}${base}/api/v1/directory/`, {
		headers: { Accept: 'application/json' },
		redirect: 'follow',
		signal: AbortSignal.timeout(20_000)
	});
	if (!response.ok) {
		throw new Error(
			`GET ${origin}${base}/api/v1/directory/ -> ${response.status}; ` +
				`cannot tell where ${site} mounts its directory`
		);
	}
	const path = (await response.json())?.setting?.path;
	if (typeof path !== 'string') {
		throw new Error(`${origin}${base}/api/v1/directory/ returned no setting.path for ${site}`);
	}
	// '' and '/' both mean "the root of the app", which is the base path when
	// there is one. Joined rather than picked: on case 3 the base is the whole
	// answer, on case 2 the setting is, and nothing forbids a site having both.
	const mounted = `${base}${path === '/' ? '' : path}`;
	return mounted === '' ? '/' : mounted;
}

/**
 * The origin a site-specific spec should browse.
 *
 * SITE_ORIGIN overrides it, so the same spec can be pointed at staging or at a
 * worker without editing it.
 */
export function originFor(site: SiteName): string {
	const override = process.env.SITE_ORIGIN;
	if (override) return override.replace(/\/$/, '');
	const origin = SITE_ORIGINS[site];
	if (!origin) {
		throw new Error(
			`unknown site "${site}"; add it to SITE_ORIGINS in tests/sites/sites.ts`
		);
	}
	return origin;
}

/**
 * The dev.yml context that serves each site, and the port it listens on.
 *
 * Duplicated from dev.yml deliberately: this is read when telling a human which
 * server to start, and when naming this tenant's Playwright project, and
 * reading YAML from either would make the suite depend on yq being installed.
 * Keep in step with dev.yml.
 */
export const SITE_CONTEXTS: Record<SiteName, { context: string; port: number } | undefined> = {
	'santelyon3.fr': { context: 'lyon3', port: 3011 },
	'sante-gadagne.fr': { context: 'gadagne', port: 3012 },
	'annuaire.medica.im': { context: 'annuaire', port: 3010 },
	'sandbox.medica.im': { context: 'sandbox', port: 3014 },
	'unipa.fr': { context: 'unipa', port: 3015 },
	'ipa.medica.im': undefined,
	'ssc.medica.im': undefined
};

/**
 * Refuse to run a site's specs unless that site is actually being served.
 *
 * One Vite process serves one tenant (PUBLIC_ORIGIN is baked at build time), so
 * only the site whose server is up answers; nginx maps every other dev.<site>
 * to a port nothing listens on and returns 502. A spec that browses on regardless
 * measures nginx's error page and reports it as a layout regression — 11 Lyon 3
 * specs failed that way, naming a grid that was never rendered.
 *
 * A status check alone cannot be the whole guard, which is why the specs still
 * assert on markup only their own page has: a site without its own /contact
 * falls back to src/routes/(common)/[fallback]/contact and answers 200. This
 * catches the case the specs cannot — nothing serving the tenant at all — and
 * says which server to start instead of leaving a false failure behind.
 *
 * Call from a `test.beforeAll`, so it costs one request per spec file.
 */
export async function requireSite(site: SiteName): Promise<void> {
	const origin = originFor(site);
	let status: number | undefined;
	let failure = '';
	try {
		const response = await fetch(`${origin}/`, {
			redirect: 'follow',
			signal: AbortSignal.timeout(15_000)
		});
		status = response.status;
		if (response.ok) return;
	} catch (error) {
		failure = error instanceof Error ? error.message : String(error);
	}

	const where = SITE_CONTEXTS[site];
	const start = where
		? `Start it with:\n    ./scripts/dev.sh --restart ${where.context}\n` +
			`(nginx routes ${origin} to :${where.port}; one site server runs at a time.)`
		: `No dev.yml context is recorded for this site in tests/sites/sites.ts.`;

	throw new Error(
		`${origin} is not serving ${site} ` +
			`(${status !== undefined ? `HTTP ${status}` : failure}).\n\n` +
			`These specs are about ${site} in particular and cannot be measured ` +
			`against another tenant, so they fail here rather than reporting a ` +
			`layout regression on a page that was never rendered.\n\n${start}`
	);
}

/**
 * Which spec files under tests/sites belong to each tenant, read from their own
 * `const SITE = '…'` lines.
 *
 * Derived rather than listed so a spec added for a tenant joins that tenant's
 * group without anyone editing a second file — the same reason test-all.sh
 * greps for these names instead of keeping its own copy, and the same failure
 * a hand-kept list invites: a spec that drifts out of it runs against whichever
 * site happens to be served.
 *
 * A spec with no SITE line is an error rather than an ungrouped straggler.
 * Silently leaving it out would put it in no tenant's group and so in no
 * server's, which is exactly the un-served run this directory exists to stop.
 *
 * The site read here is the one the spec runs against *by default*. A generic
 * spec may take an override (SITE_UNDER_TEST) and still be grouped by its
 * default, which is right: the group decides which server has to be up for the
 * plain run, and an override names its own site anyway.
 */
export function specsBySite(dir: string): Map<SiteName, string[]> {
	const grouped = new Map<SiteName, string[]>();
	for (const file of readdirSync(dir).sort()) {
		if (!file.endsWith('.spec.ts')) continue;
		// The first quoted site on the `const SITE` line, so both a plain literal
		// and an env-var default (`?? 'santelyon3.fr'`) are read the same way.
		const site = /^const SITE\b[^\n]*?'([^']+)'/m.exec(readFileSync(join(dir, file), 'utf8'))?.[1] as
			| SiteName
			| undefined;
		if (!site || !(site in SITE_ORIGINS)) {
			throw new Error(
				`tests/sites/${file} does not declare which site it runs against by default.\n` +
					`Add \`const SITE = '<site>';\` and a \`test.beforeAll(() => requireSite(SITE))\`, ` +
					`so it runs against that tenant's server rather than whichever one is up.` +
					(site ? `\nRead "${site}", which is not a known site.` : '')
			);
		}
		grouped.set(site, [...(grouped.get(site) ?? []), file]);
	}
	return grouped;
}
